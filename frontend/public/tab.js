/**
 * tab.js — XTOX cross-tab communication & background sync utility
 *
 * Provides:
 *  - BroadcastChannel-based tab messaging
 *  - Async HTTP requests (never synchronous XHR)
 *  - Tab visibility detection for live-data refresh
 *
 * FIX (Error 5): All XHR/network calls use async patterns.
 * Never use new XMLHttpRequest() with .open(method, url, false) — the third
 * argument 'false' would make it synchronous and block the main thread.
 * Instead, all requests are wrapped in Promises with onload/onerror callbacks
 * or use the modern fetch() API.
 */

(function (global) {
  'use strict';

  var CHANNEL_NAME = 'xtox-tab-sync';
  var API_BASE = (global.__NEXT_PUBLIC_API_URL) || 'https://xtox-production.up.railway.app';

  // ── BroadcastChannel for cross-tab messaging ────────────────────────────
  var channel = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(CHANNEL_NAME);
    }
  } catch (e) {
    // BroadcastChannel not supported — degrade gracefully
  }

  /**
   * Send a message to all other tabs.
   * @param {string} type  Message type identifier
   * @param {any}    data  Payload
   */
  function broadcastMessage(type, data) {
    if (!channel) return;
    try {
      channel.postMessage({ type: type, data: data, ts: Date.now() });
    } catch (e) {
      console.warn('[tab.js] broadcastMessage failed:', e.message);
    }
  }

  /**
   * Register a listener for cross-tab messages.
   * @param {Function} handler  Called with { type, data, ts }
   * @returns {Function}  Cleanup function to remove the listener
   */
  function onTabMessage(handler) {
    if (!channel) return function () {};
    var listener = function (event) {
      try { handler(event.data); } catch (e) {}
    };
    channel.addEventListener('message', listener);
    return function () { channel.removeEventListener('message', listener); };
  }

  // ── Async XHR helper (NEVER synchronous) ────────────────────────────────
  /**
   * Make an ASYNC HTTP request using XMLHttpRequest wrapped in a Promise.
   * The third argument to .open() is always TRUE (async).
   *
   * Prefer fetch() where available — this is a fallback for environments
   * that may not support it.
   *
   * @param {string} method   HTTP method
   * @param {string} url      Request URL
   * @param {any}    [body]   Optional request body (will be JSON-stringified)
   * @param {Object} [headers] Optional headers map
   * @returns {Promise<any>}  Resolves with parsed JSON or rejects on error
   */
  function asyncXHR(method, url, body, headers) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();

      // IMPORTANT: third argument is TRUE → ASYNC (not synchronous)
      // Synchronous XHR (false) is deprecated and blocks the main thread.
      xhr.open(method, url, true /* async = true */);

      // Set default headers
      xhr.setRequestHeader('Accept', 'application/json');
      if (body) {
        xhr.setRequestHeader('Content-Type', 'application/json');
      }

      // Apply custom headers
      if (headers && typeof headers === 'object') {
        Object.keys(headers).forEach(function (key) {
          xhr.setRequestHeader(key, headers[key]);
        });
      }

      // Async callbacks
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            resolve(xhr.responseText);
          }
        } else {
          reject(new Error('XHR error: ' + xhr.status + ' ' + xhr.statusText));
        }
      };

      xhr.onerror = function () {
        reject(new Error('XHR network error for: ' + url));
      };

      xhr.ontimeout = function () {
        reject(new Error('XHR timeout for: ' + url));
      };

      xhr.timeout = 15000; // 15 second timeout

      // Send the request asynchronously
      xhr.send(body ? JSON.stringify(body) : null);
    });
  }

  // ── Tab visibility tracking ──────────────────────────────────────────────
  var _visibilityListeners = [];

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', function () {
      var isVisible = document.visibilityState === 'visible';
      _visibilityListeners.forEach(function (fn) {
        try { fn(isVisible); } catch (e) {}
      });

      // Notify other tabs of visibility change
      broadcastMessage('TAB_VISIBILITY', { visible: isVisible });
    });
  }

  /**
   * Register a callback for tab visibility changes.
   * @param {Function} fn  Called with boolean (true = visible, false = hidden)
   * @returns {Function}  Cleanup function
   */
  function onVisibilityChange(fn) {
    _visibilityListeners.push(fn);
    return function () {
      var idx = _visibilityListeners.indexOf(fn);
      if (idx !== -1) _visibilityListeners.splice(idx, 1);
    };
  }

  // ── Session-tab unique ID ────────────────────────────────────────────────
  var tabId = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

  // ── Async health-check ping (non-blocking) ───────────────────────────────
  /**
   * Ping the backend to check if it's alive.
   * Uses fetch() if available, falls back to asyncXHR.
   * @returns {Promise<boolean>}
   */
  function pingBackend() {
    var url = API_BASE + '/health';

    if (typeof fetch !== 'undefined') {
      return fetch(url, { method: 'GET', cache: 'no-cache' })
        .then(function (r) { return r.ok; })
        .catch(function () { return false; });
    }

    // Fallback: async XHR (never sync)
    return asyncXHR('GET', url).then(function () { return true; }).catch(function () { return false; });
  }

  // ── Public API ───────────────────────────────────────────────────────────
  global.XTOXTab = {
    id: tabId,
    broadcast: broadcastMessage,
    onMessage: onTabMessage,
    onVisibilityChange: onVisibilityChange,
    asyncXHR: asyncXHR,
    pingBackend: pingBackend,
  };

})(typeof window !== 'undefined' ? window : this);
