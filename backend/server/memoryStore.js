/**
 * In-memory fallback store — used when MongoDB is unavailable.
 * Provides the same interface as Mongoose models so routes work unchanged.
 * Supports: findOne, findById, find, countDocuments, create,
 *           findByIdAndUpdate, findOneAndUpdate, findByIdAndDelete, deleteMany, updateMany, updateOne
 * Documents have .save() and .toObject() methods, and .constructor.updateOne for ad scoring.
 * Data is lost on restart (acceptable for dev/demo; production should use MongoDB).
 */

import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

// ─── Storage ─────────────────────────────────────────────────────────────────
const store = {
  users: new Map(),
  ads:   new Map(),
  reports: new Map(),
  notifications: new Map(),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const now = () => new Date();
const newId = () => randomUUID().replace(/-/g, '').slice(0, 24); // mongo-like 24-char id

function paginate(arr, page = 1, limit = 20) {
  const p = Math.max(1, Number(page));
  const l = Math.max(1, Number(limit));
  const start = (p - 1) * l;
  return { docs: arr.slice(start, start + l), total: arr.length, page: p, totalPages: Math.ceil(arr.length / l) };
}

function match(doc, filter = {}) {
  return Object.entries(filter).every(([k, v]) => {
    // Handle $or and $and at top level
    if (k === '$or' && Array.isArray(v)) return v.some(sub => match(doc, sub));
    if (k === '$and' && Array.isArray(v)) return v.every(sub => match(doc, sub));
    if (k === '$nor' && Array.isArray(v)) return !v.some(sub => match(doc, sub));
    if (v === null || v === undefined) return doc[k] == null;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if ('$ne'    in v) return doc[k] !== v.$ne;
      if ('$gte' in v && '$lte' in v) return doc[k] >= v.$gte && doc[k] <= v.$lte;
      if ('$gte'  in v) return doc[k] >= v.$gte;
      if ('$lte'  in v) return doc[k] <= v.$lte;
      if ('$gt'   in v) return doc[k] > v.$gt;
      if ('$lt'   in v) return doc[k] < v.$lt;
      if ('$in'   in v) return v.$in.includes(doc[k]);
      if ('$nin'  in v) return !v.$nin.includes(String(doc[k]));
      if ('$regex' in v) return new RegExp(v.$regex, v.$options || '').test(String(doc[k] || ''));
      if ('$exists' in v) return v.$exists ? doc[k] !== undefined : doc[k] === undefined;
      if ('$or' in v) return v.$or.some(sub => match(doc, { [k]: sub }));
    }
    // Handle array field membership: { users: 'someId' } → doc.users includes 'someId'
    if (Array.isArray(doc[k])) {
      return doc[k].some(item => String(item) === String(v));
    }
    // $all operator: { users: { $all: ['id1', 'id2'] } }
    if (v && typeof v === 'object' && '$all' in v) {
      if (!Array.isArray(doc[k])) return false;
      return v.$all.every(val => doc[k].some(item => String(item) === String(val)));
    }
    // Treat string IDs as equal even if types differ
    return String(doc[k]) === String(v);
  });
}

// ─── Document factory — adds .save() / .toObject() / .constructor ─────────────
function makeUserDoc(raw) {
  const d = { ...raw };
  d.toObject = function() { const { toObject, save, lean, constructor: _, ...rest } = this; return rest; };
  d.lean = function() { return this.toObject(); };
  d.save = async function() {
    const { toObject, save, lean, constructor: _, ...data } = this;
    store.users.set(String(data._id), data);
    return this;
  };
  // select() is a no-op stub so .select('-password') doesn't throw
  d.select = function() { return this; };
  d.populate = function() { return this; };
  return d;
}

function makeAdDoc(raw) {
  const d = { ...raw };
  d.toObject = function() { const { toObject, save, lean, constructor: _, ...rest } = this; return rest; };
  d.lean = function() { return this.toObject(); };
  d.save = async function() {
    const { toObject, save, lean, constructor: _, ...data } = this;
    store.ads.set(String(data._id), { ...data, updatedAt: now() });
    return this;
  };
  d.select = function() { return this; };
  d.populate = function() { return this; };
  // constructor.updateOne lets AI scoring do: ad.constructor.updateOne(filter, update)
  d.constructor = {
    updateOne: async (filter, update) => {
      const set = update.$set || update;
      store.ads.forEach((doc, id) => {
        if (match(doc, filter)) store.ads.set(id, { ...doc, ...set, updatedAt: now() });
      });
    }
  };
  return d;
}

// ─── Seed default super-admin ─────────────────────────────────────────────────
async function seedAdmin() {
  const existing = [...store.users.values()].find(u => u.email === 'ahmed_sharnou@yahoo.com');
  if (existing) return;
  const hash = await bcrypt.hash('Aa123123', 10);
  const id = newId();
  store.users.set(id, {
    _id: id, id,
    name: 'Super Admin',
    email: 'ahmed_sharnou@yahoo.com',
    password: hash,
    role: 'admin',
    country: 'EG',
    isVerified: true,
    isMuted: false,
    isHidden: false,
    createdAt: now(),
    updatedAt: now(),
  });
  console.log('[MemStore] Seeded default admin: ahmed_sharnou@yahoo.com / Aa123123');
}

// ─── User model ───────────────────────────────────────────────────────────────
export const MemUser = {
  findOne(filter, projection) {
    const doc = [...store.users.values()].find(d => match(d, filter));
    const resolvedDoc = doc ? makeUserDoc(doc) : null;
    let isLean = false;
    const q = {
      lean()    { isLean = true; return this; },
      select()  { return this; },
      populate(){ return this; },
      then(resolve, reject) {
        const val = isLean && resolvedDoc ? resolvedDoc.toObject() : resolvedDoc;
        return Promise.resolve(val).then(resolve, reject);
      },
      catch(reject) { return Promise.resolve(resolvedDoc).catch(reject); }
    };
    return q;
  },
  async findById(id) {
    const d = store.users.get(String(id));
    return d ? makeUserDoc(d) : null;
  },
  async find(filter = {}) {
    return [...store.users.values()].filter(d => match(d, filter)).map(makeUserDoc);
  },
  async countDocuments(filter = {}) {
    return [...store.users.values()].filter(d => match(d, filter)).length;
  },
  async create(data) {
    const id = newId();
    const doc = { ...data, _id: id, id, createdAt: now(), updatedAt: now() };
    store.users.set(id, doc);
    return makeUserDoc(doc);
  },
  async findByIdAndUpdate(id, update, opts = {}) {
    const doc = store.users.get(String(id));
    if (!doc) return null;
    const set = update.$set || update;
    const updated = { ...doc, ...set, updatedAt: now() };
    store.users.set(String(id), updated);
    return opts.new ? makeUserDoc(updated) : makeUserDoc(doc);
  },
  async findOneAndUpdate(filter, update, opts = {}) {
    const doc = [...store.users.values()].find(d => match(d, filter));
    if (opts.upsert && !doc) {
      // Create new doc
      const id = newId();
      const set = update.$set || update;
      const newDoc = { _id: id, id, ...set, createdAt: now(), updatedAt: now() };
      store.users.set(id, newDoc);
      return opts.new ? makeUserDoc(newDoc) : null;
    }
    if (!doc) return null;
    const set = update.$set || update;
    const updated = { ...doc, ...set, updatedAt: now() };
    store.users.set(String(doc._id), updated);
    return opts.new ? makeUserDoc(updated) : makeUserDoc(doc);
  },
  async findByIdAndDelete(id) {
    const doc = store.users.get(String(id));
    store.users.delete(String(id));
    return doc ? makeUserDoc(doc) : null;
  },
};

// ─── Ad model ─────────────────────────────────────────────────────────────────
export const MemAd = {
  find(filter = {}, projection) {
    // Return a thenable query object so .sort()/.limit()/.lean()/.populate() can be chained
    let docs = [...store.ads.values()].filter(d => match(d, filter));
    let isLean = false;
    const q = {
      _docs: docs,
      sort(s) {
        if (s && typeof s === 'object') {
          const [f, d] = Object.entries(s)[0];
          this._docs.sort((a, b) => d === -1 ? (b[f] > a[f] ? 1 : -1) : (a[f] > b[f] ? 1 : -1));
        }
        return this;
      },
      skip(n) { this._docs = this._docs.slice(Number(n) || 0); return this; },
      limit(n) { this._docs = this._docs.slice(0, n); return this; },
      lean()    { isLean = true; return this; },
      select()  { return this; },
      populate(){ return this; },
      then(resolve, reject) {
        const result = isLean
          ? this._docs.map(d => ({ ...d }))
          : this._docs.map(makeAdDoc);
        return Promise.resolve(result).then(resolve, reject);
      },
      catch(reject) { return Promise.resolve(this._docs.map(makeAdDoc)).catch(reject); }
    };
    return q;
  },
  // Fluent find() that returns a thenable query object
  findQuery(filter = {}) {
    let docs = [...store.ads.values()].filter(d => match(d, filter));
    const q = {
      _docs: docs,
      sort(s) {
        if (s && typeof s === 'object') {
          const [f, d] = Object.entries(s)[0];
          this._docs.sort((a, b) => d === -1 ? (b[f] > a[f] ? 1 : -1) : (a[f] > b[f] ? 1 : -1));
        }
        return this;
      },
      limit(n) { this._docs = this._docs.slice(0, n); return this; },
      populate() { return this; },
      select() { return this; },
      then(resolve, reject) {
        return Promise.resolve(this._docs.map(makeAdDoc)).then(resolve, reject);
      },
      [Symbol.asyncIterator]() {
        let idx = 0; const docs = this._docs.map(makeAdDoc);
        return { next: async () => idx < docs.length ? { value: docs[idx++], done: false } : { done: true } };
      }
    };
    return q;
  },
  findOne(filter, projection) {
    // Return a thenable query object so .lean()/.select()/.populate() can be chained before await
    const doc = [...store.ads.values()].find(d => match(d, filter));
    const resolvedDoc = doc ? makeAdDoc(doc) : null;
    let isLean = false;
    const q = {
      lean()    { isLean = true; return this; },
      select()  { return this; },
      populate(){ return this; },
      then(resolve, reject) {
        const val = isLean && resolvedDoc ? resolvedDoc.toObject() : resolvedDoc;
        return Promise.resolve(val).then(resolve, reject);
      },
      catch(reject) { return Promise.resolve(resolvedDoc).catch(reject); }
    };
    return q;
  },
  async findById(id) {
    const doc = store.ads.get(String(id));
    if (!doc) return null;
    const d = makeAdDoc(doc);
    // .populate() is a no-op in memory store
    d.populate = () => d;
    return d;
  },
  async countDocuments(filter = {}) {
    return [...store.ads.values()].filter(d => match(d, filter)).length;
  },
  async create(data) {
    const id = newId();
    const doc = {
      ...data, _id: id, id,
      isDeleted: false, isExpired: false, isFeatured: false,
      visibilityScore: 10, views: 0,
      createdAt: now(), updatedAt: now(),
    };
    store.ads.set(id, doc);
    return makeAdDoc(doc);
  },
  async findByIdAndUpdate(id, update, opts = {}) {
    const doc = store.ads.get(String(id));
    if (!doc) return null;
    const set = update.$set || {};
    const inc = update.$inc || {};
    const updated = { ...doc, ...set, updatedAt: now() };
    Object.entries(inc).forEach(([k, v]) => { updated[k] = (updated[k] || 0) + v; });
    // If no $set/$inc, treat entire update as $set
    if (!update.$set && !update.$inc) Object.assign(updated, update);
    store.ads.set(String(id), updated);
    return opts.new ? makeAdDoc(updated) : makeAdDoc(doc);
  },
  async findByIdAndDelete(id) {
    const doc = store.ads.get(String(id));
    store.ads.delete(String(id));
    return doc ? makeAdDoc(doc) : null;
  },
  async deleteMany(filter) {
    const ids = [...store.ads.entries()]
      .filter(([, d]) => match(d, filter))
      .map(([id]) => id);
    ids.forEach(id => store.ads.delete(id));
    return { deletedCount: ids.length };
  },
  async updateMany(filter, update) {
    const set = update.$set || update;
    let count = 0;
    store.ads.forEach((doc, id) => {
      if (match(doc, filter)) {
        store.ads.set(id, { ...doc, ...set, updatedAt: now() });
        count++;
      }
    });
    return { modifiedCount: count };
  },
  async updateOne(filter, update) {
    const set = update.$set || update;
    const inc = update.$inc || {};
    for (const [id, doc] of store.ads.entries()) {
      if (match(doc, filter)) {
        const updated = { ...doc, ...set, updatedAt: now() };
        Object.entries(inc).forEach(([k, v]) => { updated[k] = (updated[k] || 0) + v; });
        store.ads.set(id, updated);
        return { modifiedCount: 1 };
      }
    }
    return { modifiedCount: 0 };
  },
  // Paginated list helper used by admin routes
  async paginate(filter = {}, { page = 1, limit = 20, sort = { createdAt: -1 } } = {}) {
    let docs = [...store.ads.values()].filter(d => match(d, filter));
    const [sf, sd] = Object.entries(sort)[0];
    docs.sort((a, b) => sd === -1 ? (b[sf] > a[sf] ? 1 : -1) : (a[sf] > b[sf] ? 1 : -1));
    return paginate(docs, page, limit);
  },
};

// ─── Report model ─────────────────────────────────────────────────────────────
export const MemReport = {
  async create(data) {
    const id = newId();
    const doc = { ...data, _id: id, id, createdAt: now() };
    store.reports.set(id, doc);
    return doc;
  },
  async find(filter = {}) {
    return [...store.reports.values()].filter(d => match(d, filter));
  },
  async countDocuments(filter = {}) {
    return [...store.reports.values()].filter(d => match(d, filter)).length;
  },
};


// ─── Chat model (embedded messages, mirrors Mongoose Chat model) ─────────────
function makeChatDoc(raw) {
  const d = { ...raw, messages: Array.isArray(raw.messages) ? [...raw.messages] : [] };
  d.toObject = function() {
    const { toObject, save, lean, ...rest } = this;
    return rest;
  };
  d.lean = function() { return this.toObject(); };
  d.save = async function() {
    const { toObject, save, lean, ...data } = this;
    store.chats.set(String(data._id), { ...data, updatedAt: now() });
    return this;
  };
  return d;
}

export const MemChat = {
  find(filter = {}) {
    store.chats = store.chats || new Map();
    let docs = [...store.chats.values()].filter(d => match(d, filter));
    let isLean = false;
    const q = {
      _docs: docs,
      sort(s) {
        if (s && typeof s === 'object') {
          const [f, dir] = Object.entries(s)[0];
          this._docs.sort((a, b) => dir === -1 ? (b[f] > a[f] ? 1 : -1) : (a[f] > b[f] ? 1 : -1));
        }
        return this;
      },
      lean()    { isLean = true; return this; },
      select()  { return this; },
      populate(){ return this; },
      then(resolve, reject) {
        const result = isLean ? this._docs.map(d => ({ ...d })) : this._docs.map(makeChatDoc);
        return Promise.resolve(result).then(resolve, reject);
      },
      catch(reject) { return Promise.resolve(this._docs.map(makeChatDoc)).catch(reject); }
    };
    return q;
  },
  findOne(filter) {
    store.chats = store.chats || new Map();
    const doc = [...store.chats.values()].find(d => match(d, filter));
    const resolved = doc ? makeChatDoc(doc) : null;
    let isLean = false;
    const q = {
      lean()    { isLean = true; return this; },
      select()  { return this; },
      populate(){ return this; },
      then(resolve, reject) {
        const val = isLean && resolved ? resolved.toObject() : resolved;
        return Promise.resolve(val).then(resolve, reject);
      },
      catch(reject) { return Promise.resolve(resolved).catch(reject); }
    };
    return q;
  },
  async findById(id) {
    store.chats = store.chats || new Map();
    const doc = store.chats.get(String(id));
    return doc ? makeChatDoc(doc) : null;
  },
  async create(data) {
    store.chats = store.chats || new Map();
    const id = newId();
    const doc = { ...data, _id: id, id, messages: data.messages || [], createdAt: now(), updatedAt: now() };
    store.chats.set(id, doc);
    return makeChatDoc(doc);
  },
  async findByIdAndUpdate(id, update, opts = {}) {
    store.chats = store.chats || new Map();
    const doc = store.chats.get(String(id));
    if (!doc) return null;
    const set = update.$set || update;
    const updated = { ...doc, ...set, updatedAt: now() };
    store.chats.set(String(id), updated);
    return opts.new ? makeChatDoc(updated) : makeChatDoc(doc);
  },
};

// ─── Init ─────────────────────────────────────────────────────────────────────
export async function initMemoryStore() {
  await seedAdmin();
  console.log('[MemStore] ✅ In-memory store ready (no MongoDB needed)');
  console.log('[MemStore] ⚠️  Data is NOT persisted across restarts. Use MongoDB for production.');
}

// ─── Shared mutable DB state (imported by routes) ─────────────────────────────
export const dbState = {
  usingMemoryStore: false
};

export default store;
