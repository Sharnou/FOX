// backend/server/couchbaseModels.js
// Thin Mongoose-compatible wrappers backed by Couchbase KV + N1QL.
// Exported: CouchbaseAd, CouchbaseUser, CouchbaseChat, CouchbaseReport

import { randomUUID } from 'crypto';
import { getCouchbaseCollection, getCouchbaseCluster } from './dbManager.js';

const BUCKET = process.env.COUCHBASE_BUCKET || 'XTOX';

// ── Doc-key helpers ──────────────────────────────────────────────────────────
const adKey    = id => `ad::${id}`;
const userKey  = id => `user::${id}`;
const chatKey  = id => `chat::${id}`;
const reportKey = id => `report::${id}`;

// ── N1QL helper ──────────────────────────────────────────────────────────────
async function n1ql(sql, params = {}) {
  const cluster = getCouchbaseCluster();
  if (!cluster) throw new Error('Couchbase cluster not available');
  const result = await cluster.query(sql, { namedParameters: params });
  return result.rows;
}

// ── Simple filter matcher (mirrors MemStore match) ────────────────────────────
function match(doc, filter = {}) {
  return Object.entries(filter).every(([k, v]) => {
    if (k === '$or'  && Array.isArray(v)) return v.some(sub => match(doc, sub));
    if (k === '$and' && Array.isArray(v)) return v.every(sub => match(doc, sub));
    if (v === null || v === undefined) return doc[k] == null;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if ('$ne'  in v) return doc[k] !== v.$ne;
      if ('$gte' in v && '$lte' in v) return doc[k] >= v.$gte && doc[k] <= v.$lte;
      if ('$gte' in v) return doc[k] >= v.$gte;
      if ('$lte' in v) return doc[k] <= v.$lte;
      if ('$gt'  in v) return doc[k] > v.$gt;
      if ('$lt'  in v) return doc[k] < v.$lt;
      if ('$in'  in v) return v.$in.includes(doc[k]);
      if ('$nin' in v) return !v.$nin.includes(String(doc[k]));
      if ('$regex' in v) return new RegExp(v.$regex, v.$options || '').test(String(doc[k] || ''));
      if ('$exists' in v) return v.$exists ? doc[k] !== undefined : doc[k] === undefined;
      if ('$all' in v && Array.isArray(v.$all)) {
        if (!Array.isArray(doc[k])) return false;
        return v.$all.every(val => doc[k].some(item => String(item) === String(val)));
      }
    }
    if (Array.isArray(doc[k])) return doc[k].some(item => String(item) === String(v));
    return String(doc[k]) === String(v);
  });
}

// ── KV fetch all docs of a given type ────────────────────────────────────────
async function fetchAllByType(type) {
  const rows = await n1ql(
    `SELECT META().id as _cbid, `${BUCKET}`.* FROM `${BUCKET}` WHERE type = $type`,
    { type }
  ).catch(() => []);
  return rows.map(r => {
    const { _cbid, ...rest } = r;
    // _cbid is like "ad::uuid" — extract just the uuid part
    const id = _cbid ? _cbid.split('::').slice(1).join('::') : rest._id;
    return { ...rest, _id: id || _cbid };
  });
}

// ── Make a doc chainable (lean / populate / select stubs) ────────────────────
function makeChainable(doc) {
  if (!doc) return doc;
  const d = { ...doc };
  d.toObject = function () {
    const { toObject, lean, save, select, populate, constructor: _, ...rest } = this;
    return rest;
  };
  d.lean     = function () { return this.toObject(); };
  d.select   = function () { return this; };
  d.populate = function () { return this; };
  d.save = async function () {
    // Delegate back to the originating model's upsert
    throw new Error('[CouchbaseModel] .save() called — use model create/update methods');
  };
  return d;
}

// ── Thenable query wrapper (supports .sort / .skip / .limit / .lean) ─────────
function makeQuery(docsPromise) {
  let sortSpec  = null;
  let skipN     = 0;
  let limitN    = Infinity;
  let isLean    = false;

  const q = {
    sort(s) {
      if (s && typeof s === 'object') sortSpec = s;
      return this;
    },
    skip(n) { skipN = Number(n) || 0; return this; },
    limit(n) { limitN = n; return this; },
    lean()    { isLean = true; return this; },
    select()  { return this; },
    populate(){ return this; },

    then(resolve, reject) {
      return docsPromise.then(raw => {
        let docs = Array.isArray(raw) ? raw : [];
        if (sortSpec) {
          const [sf, sd] = Object.entries(sortSpec)[0];
          docs.sort((a, b) => (sd === -1 || sd === 'desc')
            ? (b[sf] > a[sf] ? 1 : -1)
            : (a[sf] > b[sf] ? 1 : -1));
        }
        if (skipN)          docs = docs.slice(skipN);
        if (limitN < Infinity) docs = docs.slice(0, limitN);
        const result = isLean ? docs.map(d => ({ ...d })) : docs.map(makeChainable);
        return result;
      }).then(resolve, reject);
    },
    catch(reject) { return this.then(undefined, reject); },
  };
  return q;
}

// ─────────────────────────────────────────────────────────────────────────────
// CouchbaseAd
// ─────────────────────────────────────────────────────────────────────────────
export const CouchbaseAd = {
  find(filter = {}) {
    const docsP = fetchAllByType('ad').then(all => all.filter(d => match(d, filter)));
    const q = makeQuery(docsP);
    // Also attach constructor.updateOne so AI scoring works
    q.constructor = { updateOne: (...a) => CouchbaseAd.updateOne(...a) };
    return q;
  },

  findOne(filter = {}) {
    const docsP = fetchAllByType('ad').then(all => {
      const doc = all.find(d => match(d, filter));
      return doc ? [doc] : [];
    });
    const q = makeQuery(docsP);
    return {
      lean()    { return this; },
      select()  { return this; },
      populate(){ return this; },
      then(resolve, reject) {
        return docsP.then(docs => docs[0] ? makeChainable(docs[0]) : null).then(resolve, reject);
      },
      catch(reject) { return docsP.then(docs => docs[0] ? makeChainable(docs[0]) : null).catch(reject); },
    };
  },

  async findById(id) {
    try {
      const col = getCouchbaseCollection();
      const result = await col.get(adKey(id));
      const d = { _id: id, ...result.content };
      const doc = makeChainable(d);
      doc.save = async function () {
        const { save, lean, toObject, select, populate, constructor: _, ...data } = this;
        await getCouchbaseCollection().replace(adKey(id), { ...data, type: 'ad' });
        return this;
      };
      doc.constructor = { updateOne: (...a) => CouchbaseAd.updateOne(...a) };
      return doc;
    } catch { return null; }
  },

  async findByIdAndDelete(id) {
    const existing = await this.findById(id);
    if (!existing) return null;
    await getCouchbaseCollection().remove(adKey(id));
    return existing;
  },

  async findByIdAndUpdate(id, update, opts = {}) {
    const existing = await this.findById(id);
    if (!existing) return null;
    const set = update.$set || {};
    const inc = update.$inc || {};
    const updated = { ...existing.toObject(), ...set };
    Object.entries(inc).forEach(([k, v]) => { updated[k] = (updated[k] || 0) + v; });
    if (!update.$set && !update.$inc) Object.assign(updated, update);
    updated.type = 'ad';
    updated.updatedAt = new Date();
    await getCouchbaseCollection().replace(adKey(id), updated);
    return opts.new ? makeChainable(updated) : existing;
  },

  async countDocuments(filter = {}) {
    const all = await fetchAllByType('ad');
    return all.filter(d => match(d, filter)).length;
  },

  async create(data) {
    const col = getCouchbaseCollection();
    const id = randomUUID().replace(/-/g, '').slice(0, 24);
    const doc = {
      ...data,
      _id: id,
      type: 'ad',
      isDeleted: { $ne: true },
      isExpired: { $ne: true },
      isFeatured: false,
      visibilityScore: data.visibilityScore ?? 10,
      views: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await col.insert(adKey(id), doc);
    const result = makeChainable(doc);
    result.save = async function () {
      const { save, lean, toObject, select, populate, constructor: _, ...d } = this;
      await getCouchbaseCollection().replace(adKey(id), { ...d, type: 'ad' });
      return this;
    };
    result.constructor = { updateOne: (...a) => CouchbaseAd.updateOne(...a) };
    return result;
  },

  async updateMany(filter, update) {
    const all = await fetchAllByType('ad');
    const matching = all.filter(d => match(d, filter));
    const set = update.$set || {};
    const col = getCouchbaseCollection();
    await Promise.all(matching.map(doc => {
      const updated = { ...doc, ...set, type: 'ad', updatedAt: new Date() };
      return col.replace(adKey(doc._id), updated);
    }));
    return { modifiedCount: matching.length };
  },

  async updateOne(filter, update) {
    const all = await fetchAllByType('ad');
    const doc = all.find(d => match(d, filter));
    if (!doc) return { modifiedCount: 0 };
    const set = update.$set || {};
    const inc = update.$inc || {};
    const updated = { ...doc, ...set, type: 'ad', updatedAt: new Date() };
    Object.entries(inc).forEach(([k, v]) => { updated[k] = (updated[k] || 0) + v; });
    await getCouchbaseCollection().replace(adKey(doc._id), updated);
    return { modifiedCount: 1 };
  },

  async deleteMany(filter) {
    const all  = await fetchAllByType('ad');
    const hits = all.filter(d => match(d, filter));
    const col  = getCouchbaseCollection();
    await Promise.all(hits.map(d => col.remove(adKey(d._id)).catch(() => {})));
    return { deletedCount: hits.length };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CouchbaseUser
// ─────────────────────────────────────────────────────────────────────────────
export const CouchbaseUser = {
  findOne(filter = {}) {
    const docsP = fetchAllByType('user').then(all => {
      const doc = all.find(d => match(d, filter));
      return doc ? makeChainable(doc) : null;
    });
    return {
      lean()    { return this; },
      select()  { return this; },
      populate(){ return this; },
      then(resolve, reject) { return docsP.then(resolve, reject); },
      catch(reject)         { return docsP.catch(reject); },
    };
  },

  async findById(id) {
    try {
      const col = getCouchbaseCollection();
      const result = await col.get(userKey(id));
      const d = { _id: id, ...result.content };
      const doc = makeChainable(d);
      doc.save = async function () {
        const { save, lean, toObject, select, populate, constructor: _, ...data } = this;
        await getCouchbaseCollection().replace(userKey(id), { ...data, type: 'user' });
        return this;
      };
      return doc;
    } catch { return null; }
  },

  async find(filter = {}) {
    const all = await fetchAllByType('user');
    return all.filter(d => match(d, filter)).map(makeChainable);
  },

  async countDocuments(filter = {}) {
    const all = await fetchAllByType('user');
    return all.filter(d => match(d, filter)).length;
  },

  async create(data) {
    const col = getCouchbaseCollection();
    const id = randomUUID().replace(/-/g, '').slice(0, 24);
    const doc = { ...data, _id: id, type: 'user', createdAt: new Date(), updatedAt: new Date() };
    await col.insert(userKey(id), doc);
    const result = makeChainable(doc);
    result.save = async function () {
      const { save, lean, toObject, select, populate, constructor: _, ...d } = this;
      await getCouchbaseCollection().replace(userKey(id), { ...d, type: 'user' });
      return this;
    };
    return result;
  },

  async findByIdAndUpdate(id, update, opts = {}) {
    const existing = await this.findById(id);
    if (!existing) return null;
    const set = update.$set || {};
    const updated = { ...existing.toObject(), ...set, type: 'user', updatedAt: new Date() };
    await getCouchbaseCollection().replace(userKey(id), updated);
    return opts.new ? makeChainable(updated) : existing;
  },

  async findOneAndUpdate(filter, update, opts = {}) {
    const all = await fetchAllByType('user');
    const doc = all.find(d => match(d, filter));
    const col = getCouchbaseCollection();
    if (!doc) {
      if (opts.upsert) {
        const id  = randomUUID().replace(/-/g, '').slice(0, 24);
        const set = update.$set || update;
        const newDoc = { ...set, _id: id, type: 'user', createdAt: new Date(), updatedAt: new Date() };
        await col.insert(userKey(id), newDoc);
        return opts.new ? makeChainable(newDoc) : null;
      }
      return null;
    }
    const set     = update.$set || {};
    const updated = { ...doc, ...set, type: 'user', updatedAt: new Date() };
    await col.replace(userKey(doc._id), updated);
    return opts.new ? makeChainable(updated) : makeChainable(doc);
  },

  async findByIdAndDelete(id) {
    const existing = await this.findById(id);
    if (!existing) return null;
    await getCouchbaseCollection().remove(userKey(id));
    return existing;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CouchbaseChat
// ─────────────────────────────────────────────────────────────────────────────
export const CouchbaseChat = {
  find(filter = {}) {
    const docsP = fetchAllByType('chat').then(all => all.filter(d => match(d, filter)));
    return makeQuery(docsP);
  },

  findOne(filter = {}) {
    const docsP = fetchAllByType('chat').then(all => {
      return all.find(d => match(d, filter)) || null;
    });
    return {
      lean()    { return this; },
      select()  { return this; },
      populate(){ return this; },
      then(resolve, reject) {
        return docsP.then(doc => doc ? makeChatDoc(doc) : null).then(resolve, reject);
      },
      catch(reject) { return docsP.then(doc => doc ? makeChatDoc(doc) : null).catch(reject); },
    };
  },

  async findById(id) {
    try {
      const col    = getCouchbaseCollection();
      const result = await col.get(chatKey(id));
      return makeChatDoc({ _id: id, ...result.content });
    } catch { return null; }
  },

  async create(data) {
    const col = getCouchbaseCollection();
    const id  = randomUUID().replace(/-/g, '').slice(0, 24);
    const doc = {
      ...data,
      _id: id,
      type: 'chat',
      messages: data.messages || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await col.insert(chatKey(id), doc);
    return makeChatDoc(doc);
  },

  async findByIdAndUpdate(id, update, opts = {}) {
    const existing = await this.findById(id);
    if (!existing) return null;
    const set     = update.$set || update;
    const updated = { ...existing.toObject(), ...set, type: 'chat', updatedAt: new Date() };
    await getCouchbaseCollection().replace(chatKey(id), updated);
    return opts.new ? makeChatDoc(updated) : existing;
  },
};

function makeChatDoc(raw) {
  const d = { ...raw, messages: Array.isArray(raw.messages) ? [...raw.messages] : [] };
  d.toObject = function () {
    const { toObject, lean, save, select, populate, ...rest } = this;
    return rest;
  };
  d.lean     = function () { return this.toObject(); };
  d.select   = function () { return this; };
  d.populate = function () { return this; };
  d.save     = async function () {
    const { toObject, lean, save, select, populate, ...data } = this;
    await getCouchbaseCollection().replace(chatKey(data._id), { ...data, type: 'chat', updatedAt: new Date() });
    return this;
  };
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// CouchbaseReport
// ─────────────────────────────────────────────────────────────────────────────
export const CouchbaseReport = {
  async create(data) {
    const col = getCouchbaseCollection();
    const id  = randomUUID().replace(/-/g, '').slice(0, 24);
    const doc = { ...data, _id: id, type: 'report', createdAt: new Date() };
    await col.insert(reportKey(id), doc);
    return doc;
  },
  async find(filter = {}) {
    const all = await fetchAllByType('report');
    return all.filter(d => match(d, filter));
  },
  async countDocuments(filter = {}) {
    const all = await fetchAllByType('report');
    return all.filter(d => match(d, filter)).length;
  },
};
