'use client';
// Unified FOX API client: tries real API first, falls back to local mock.
// Adapted from XTOX for Next.js (App Router) — uses NEXT_PUBLIC_* env vars.

const API_URL = (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : '') || '';
const tokenKey = 'xtox_token';

const getToken = () => (typeof localStorage !== 'undefined' ? localStorage.getItem(tokenKey) : null);
const getStoredCountry = () => (typeof localStorage !== 'undefined' ? localStorage.getItem('fox_country') : null);
const setToken = (val) => {
  if (typeof localStorage === 'undefined') return;
  if (val) localStorage.setItem(tokenKey, val);
  else localStorage.removeItem(tokenKey);
};

async function api(path, { method = 'GET', body } = {}) {
  if (!API_URL) throw new Error('API_URL not set');
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(API_URL + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error('API ' + res.status);
  return res.json();
}

const safe = async (fn, fallback) => {
  if (!API_URL) return typeof fallback === 'function' ? fallback() : fallback;
  try {
    return await fn();
  } catch (err) {
    console.warn('[FOXClient] falling back to mock:', err.message);
    return typeof fallback === 'function' ? fallback() : fallback;
  }
};

const uuid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

// Seed demo data
const verifiedNow = new Date().toISOString();
const demoUsers = [
  { id: uuid(), email: 'demo@fox.app', mobile: '+10000000001', full_name: 'Demo Seller', role: 'user', verified_at: verifiedNow },
  { id: uuid(), email: 'buyer@fox.app', mobile: '+10000000002', full_name: 'Buyer One', role: 'user', verified_at: verifiedNow },
  { id: uuid(), email: 'admin@fox.app', mobile: '+10000000003', full_name: 'Super Admin', role: 'admin', verified_at: verifiedNow },
];


const demoFavorites = [];
const demoMessages = [];
const demoReviews = [];
const demoNotifications = [
  { id: uuid(), title: 'Welcome to FOX', created_date: new Date().toISOString() },
];
const demoAdminChat = [];
const demoBanners = [];

const matchFilter = (item, filter = {}) =>
  Object.entries(filter).every(([k, v]) => item?.[k] === v);

const sortBy = (arr, sortField = 'created_date') => {
  if (!sortField) return arr;
  const desc = sortField.startsWith('-');
  const field = desc ? sortField.slice(1) : sortField;
  return [...arr].sort((a, b) => {
    if (a?.[field] === b?.[field]) return 0;
    return (a?.[field] > b?.[field] ? 1 : -1) * (desc ? -1 : 1);
  });
};

const makeEntity = (store) => ({
  list: async (sort, limit = store.length) => sortBy(store, sort).slice(0, limit),
  filter: async (filterObj, sort, limit = store.length) =>
    sortBy(store.filter((i) => matchFilter(i, filterObj)), sort).slice(0, limit),
  create: async (data) => {
    const item = { ...data, id: uuid(), created_date: new Date().toISOString() };
    store.push(item);
    return item;
  },
  update: async (id, patch) => {
    const idx = store.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    store[idx] = { ...store[idx], ...patch };
    return store[idx];
  },
  delete: async (id) => {
    const idx = store.findIndex((i) => i.id === id);
    if (idx === -1) return false;
    store.splice(idx, 1);
    return true;
  },
  subscribe: (cb) => {
    const interval = setInterval(() => cb({}), 30000);
    return () => clearInterval(interval);
  },
});

const noop = async () => {};

// -------- AI Provider chain (NEXT_PUBLIC_ env vars) --------
const getEnv = (name) =>
  typeof process !== 'undefined' ? process.env?.[name] : undefined;

const AI_PROVIDERS = [
  {
    name: 'gemini',
    get key() { return getEnv('NEXT_PUBLIC_GEMINI_API_KEY'); },
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    call: async (payload, key) => {
      const body = { contents: [{ parts: [{ text: payload.prompt || '' }] }] };
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('gemini fail');
      const json = await res.json();
      return { text: json.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') || '' };
    },
  },
  {
    name: 'groq-llama',
    get key() { return getEnv('NEXT_PUBLIC_GROQ_API_KEY'); },
    url: 'https://api.groq.com/openai/v1/chat/completions',
    call: async (payload, key) => {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: payload.prompt || '' }] }),
      });
      if (!res.ok) throw new Error('groq fail');
      const json = await res.json();
      return { text: json.choices?.[0]?.message?.content || '' };
    },
  },
  {
    name: 'openai',
    get key() { return getEnv('NEXT_PUBLIC_OPENAI_API_KEY'); },
    url: 'https://api.openai.com/v1/chat/completions',
    call: async (payload, key) => {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: payload.prompt || '' }] }),
      });
      if (!res.ok) throw new Error('openai fail');
      const json = await res.json();
      return { text: json.choices?.[0]?.message?.content || '' };
    },
  },
];

async function callMultiProvider(payload) {
  for (const p of AI_PROVIDERS) {
    if (!p.key) continue;
    try {
      const res = await p.call(payload, p.key);
      if (res) return { ...res, provider: p.name };
    } catch {
      // try next
    }
  }
  return null;
}

// Mock client
const mock = {
  entities: {
    Ad: makeEntity([]),
    Favorite: makeEntity(demoFavorites),
    Message: makeEntity(demoMessages),
    SellerReview: makeEntity(demoReviews),
    Notification: makeEntity(demoNotifications),
    AdminChat: makeEntity(demoAdminChat),
    User: makeEntity(demoUsers),
    Banner: makeEntity(demoBanners),
  },
  auth: {
    me: async () => null,
    updateMe: noop,
    login: async ({ identifier }) => {
      const user = demoUsers.find(u => u.email === identifier || u.mobile === identifier);
      return { token: null, user: user || demoUsers[0] };
    },
    register: async ({ email, mobile, full_name }) => {
      const newUser = { id: uuid(), email, mobile, full_name, role: 'user', verified_at: null };
      demoUsers.push(newUser);
      return { token: null, user: newUser };
    },
    logout: () => { setToken(null); return Promise.resolve(); },
    redirectToLogin: () => {},
  },
  integrations: {
    Core: {
      InvokeLLM: async ({ prompt, response_json_schema }) => {
        if (response_json_schema?.properties?.approved) return { approved: true, reason: '' };
        return { text: 'Mocked response for: ' + (prompt?.slice(0, 60) ?? 'N/A') };
      },
      UploadFile: async () => ({
        file_url: 'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=800',
      }),
      SendEmail: async () => ({ status: 'sent' }),
    },
  },
};

export const FOX = {
  entities: {
    Ad: {
      list: (sort, limit) => {
        const country = getStoredCountry();
        const qs = new URLSearchParams({ status: 'active', limit: limit || 100, ...(country ? { country } : {}) }).toString();
        return safe(() => api('/ads?' + qs), () => mock.entities.Ad.filter(country ? { country } : {}, sort, limit));
      },
      filter: (filter = {}, sort, limit) => {
        const country = filter.country || getStoredCountry();
        const qs = new URLSearchParams({ ...filter, ...(country ? { country } : {}), limit: limit || 100 }).toString();
        return safe(() => api('/ads?' + qs), () => mock.entities.Ad.filter({ ...filter, ...(country ? { country } : {}) }, sort, limit));
      },
      create: (data) => safe(() => api('/ads', { method: 'POST', body: data }), () => mock.entities.Ad.create(data)),
      update: (id, patch) => safe(() => api('/ads/' + id, { method: 'PATCH', body: patch }), () => mock.entities.Ad.update(id, patch)),
      delete: (id) => safe(() => api('/ads/' + id, { method: 'DELETE' }), () => mock.entities.Ad.delete(id)),
    },
    Favorite: {
      list: () => safe(() => api('/favorites'), () => mock.entities.Favorite.list()),
      filter: (filter) => safe(async () => { const favs = await api('/favorites'); return filter ? favs.filter(f => Object.entries(filter).every(([k, v]) => f[k] === v)) : favs; }, () => mock.entities.Favorite.filter(filter)),
      create: (data) => safe(() => api('/favorites', { method: 'POST', body: data }), () => mock.entities.Favorite.create(data)),
      delete: (id) => safe(() => api('/favorites/' + id, { method: 'DELETE' }), () => mock.entities.Favorite.delete(id)),
    },
    Message: {
      filter: (filter) => {
        const conversation = filter?.ad_id || filter?.conversation;
        if (!conversation) return Promise.resolve([]);
        return safe(() => api('/chat/' + conversation), () => mock.entities.Message.filter(filter));
      },
      create: (data) => safe(() => api('/chat', { method: 'POST', body: data }), () => mock.entities.Message.create(data)),
    },
    Notification: {
      list: (sort, limit) => safe(() => api('/notifications?limit=' + (limit || 10)), () => mock.entities.Notification.list(sort, limit)),
    },
    User: {
      list: () => safe(() => api('/auth/users'), () => mock.entities.User.list()),
    },
  },
  auth: {
    me: () => safe(() => api('/auth/me'), () => mock.auth.me()),
    updateMe: noop,
    login: (identifier, password) =>
      safe(
        async () => {
          const { token, user } = await api('/auth/login', { method: 'POST', body: { identifier, password } });
          setToken(token);
          return { token, user };
        },
        async () => {
          const demo = demoUsers.find(u => u.email === identifier || u.mobile === identifier) || demoUsers[0];
          return { token: null, user: demo };
        }
      ),
    register: (email, password, full_name, mobile) =>
      safe(
        async () => api('/auth/register', { method: 'POST', body: { email, password, full_name, mobile } }),
        async () => {
          const newUser = { id: uuid(), email, mobile, full_name, role: 'user' };
          demoUsers.push(newUser);
          return { token: null, user: newUser };
        }
      ),
    logout: () => { setToken(null); return Promise.resolve(); },
    redirectToLogin: () => {},
    setToken,
  },
  integrations: {
    Core: {
      InvokeLLM: async (payload) => {
        const multi = await callMultiProvider(payload);
        if (multi?.text) return { text: multi.text, provider: multi.provider };
        return mock.integrations.Core.InvokeLLM(payload);
      },
      UploadFile: (args) => mock.integrations.Core.UploadFile(args),
      SendEmail: (args) => mock.integrations.Core.SendEmail(args),
    },
  },
};

// Legacy alias
export const XTOX = FOX;
export default FOX;
