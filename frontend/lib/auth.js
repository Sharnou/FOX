/**
 * frontend/lib/auth.js
 * Shared auth utilities: token storage (IDB + localStorage), expiry helpers.
 * Used by login, register, layout, logout, service-worker bridge.
 */

// ── IndexedDB: store JWT for Service Worker background pings ──────────────

function _openAuthDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('xtox-auth', 1);
    req.onupgradeneeded = (e) => {
      try { e.target.result.createObjectStore('tokens'); } catch (_) {}
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

export async function storeTokenForSW(token) {
  if (typeof indexedDB === 'undefined' || !token) return;
  try {
    const db = await _openAuthDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('tokens', 'readwrite');
      tx.objectStore('tokens').put(token, 'jwt');
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (e) {
    console.warn('[Auth] storeTokenForSW failed:', e);
  }
}

export async function getStoredToken() {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const db = await _openAuthDB();
    return await new Promise((resolve) => {
      const tx = db.transaction('tokens', 'readonly');
      const req = tx.objectStore('tokens').get('jwt');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror  = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export function clearStoredToken() {
  try {
    if (typeof indexedDB !== 'undefined') {
      indexedDB.deleteDatabase('xtox-auth');
    }
  } catch (_) {}
}

// ── localStorage: canonical key = 'xtox_token' ───────────────────────────

/**
 * Read JWT from localStorage.
 * Reads 'xtox_token' first; falls back to legacy 'token' / 'fox_token'.
 * Call this everywhere instead of direct localStorage.getItem('token').
 */
export function getToken() {
  if (typeof localStorage === 'undefined') return null;
  return (
    localStorage.getItem('xtox_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('fox_token') ||
    localStorage.getItem('xtox_admin_token') ||
    null
  );
}

/**
 * Write JWT to localStorage under the canonical key ('xtox_token').
 * Also writes to legacy keys so other pages that still read 'token' work.
 */
export function setToken(token) {
  if (typeof localStorage === 'undefined' || !token) return;
  localStorage.setItem('xtox_token', token);
  localStorage.setItem('token', token);      // legacy fallback for pages not yet migrated
}

/**
 * Remove ALL token keys from localStorage.
 */
export function clearToken() {
  if (typeof localStorage === 'undefined') return;
  ['xtox_token', 'token', 'fox_token', 'xtox_admin_token', 'authToken'].forEach(k => {
    try { localStorage.removeItem(k); } catch (_) {}
  });
}

// ── JWT expiry helpers ────────────────────────────────────────────────────

export function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function getTokenTTLSeconds(token) {
  if (!token) return 0;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return Math.max(0, Math.floor((payload.exp * 1000 - Date.now()) / 1000));
  } catch {
    return 0;
  }
}

// ── Full session store (called after login/register/OAuth) ────────────────

/**
 * Store a full auth session from a backend response object.
 * data = { token, user: { id, xtoxId, xtoxEmail, name, avatar, ... } }
 * Writes to localStorage AND IndexedDB (for SW).
 */
export async function storeSession(data) {
  if (typeof window === 'undefined' || !data || !data.token) return;
  const { token, user } = data;

  // 1. localStorage (canonical + legacy)
  setToken(token);
  if (user) {
    try {
      localStorage.setItem('user', JSON.stringify({ ...user, token }));
      if (user.xtoxId)    localStorage.setItem('xtoxId',    user.xtoxId);
      if (user.xtoxEmail) localStorage.setItem('xtoxEmail', user.xtoxEmail);
      if (user.name)      localStorage.setItem('userName',  user.name);
      if (user.id)        localStorage.setItem('userId',    user.id);
      if (user.avatar)    localStorage.setItem('userAvatar',user.avatar);
      if (user.country)   localStorage.setItem('country',   user.country);
    } catch (_) {}
  }

  // 2. IndexedDB (for SW)
  await storeTokenForSW(token);
}

// ── Full logout cleanup (call before redirect to /login) ──────────────────

export async function fullLogout(apiBase) {
  // 1. Notify backend (fire-and-forget)
  const tok = getToken();
  if (tok && apiBase) {
    fetch(apiBase + '/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    }).catch(() => {});
  }

  // 2. Clear localStorage
  clearToken();
  ['xtoxId', 'xtoxEmail', 'userName', 'userId', 'userAvatar', 'user',
   'xtox_user', 'xtox_admin_user', 'country'].forEach(k => {
    try { localStorage.removeItem(k); } catch (_) {}
  });

  // 3. Clear IndexedDB
  clearStoredToken();

  // 4. Unsubscribe push (best-effort)
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (reg) {
        const sub = await reg.pushManager.getSubscription().catch(() => null);
        if (sub) await sub.unsubscribe().catch(() => {});
      }
    }
  } catch (_) {}
}
