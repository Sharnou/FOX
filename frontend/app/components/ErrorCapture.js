'use client';
import { useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

export default function ErrorCapture() {
  useEffect(() => {
    // Capture the ORIGINAL fetch BEFORE patching — reportError MUST use this directly
    // to avoid triggering the patched fetch, which would create an infinite async loop
    const origFetch = window.fetch;

    // Timestamp for unhandledrejection debounce
    let lastReportTime = 0;

    /**
     * reportError — sends an error payload to /api/errors.
     * IMPORTANT: uses origFetch (not window.fetch) to prevent recursive interception.
     *
     * Guards:
     *  1. Offline guard: bail immediately if navigator.onLine is false
     *  2. Network error catch: do NOT retry on TypeError / fetch failure
     *  3. Max retries: hard cap at 3 attempts with exponential backoff
     */
    async function reportError(data, retries = 0) {
      if (retries >= 3) return;                                    // hard cap
      if (typeof navigator !== 'undefined' && !navigator.onLine) return; // offline guard

      try {
        const res = await origFetch(API + '/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            userAgent: navigator.userAgent,
            url: location.href,
          }),
        });
        // Server error → retry with backoff (max 3 total)
        if (!res.ok && res.status >= 500 && retries < 2) {
          await new Promise((r) => setTimeout(r, 1000 * (retries + 1)));
          return reportError(data, retries + 1);
        }
      } catch {
        // Network failure (TypeError / ERR_INTERNET_DISCONNECTED / Failed to fetch)
        // Do NOT retry — just stop silently
        return;
      }
    }

    // ── JS error handler ──────────────────────────────────────────────────────
    const handleError = (e) => {
      reportError({ message: e.message, stack: e.error?.stack, type: 'js_error' });
    };

    // ── Unhandled promise rejection handler — deduplicated within 2 s ─────────
    const handleRejection = (e) => {
      const now = Date.now();
      if (now - lastReportTime < 2000) return; // dedupe: same error within 2 s → skip
      lastReportTime = now;
      const msg = e.reason?.message || String(e.reason);
      reportError({ message: msg, stack: e.reason?.stack, type: 'unhandled_rejection' });
    };

    // ── Global fetch interceptor ───────────────────────────────────────────────
    // Intercepts all fetch calls to capture API/network errors.
    // CRITICAL: internally uses origFetch so it never intercepts itself.
    window.fetch = async (...args) => {
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');

      try {
        const res = await origFetch(...args);

        // Capture 5xx API errors, but never for /api/errors itself (avoid loops)
        if (!res.ok && res.status >= 500 && !url.includes('/api/errors')) {
          reportError({
            message: 'API ' + res.status + ': ' + url,
            type: 'api_error',
            url,
          });
        }
        return res;
      } catch (err) {
        // Only report network errors for non-error-reporting URLs
        if (!url.includes('/api/errors')) {
          reportError({ message: err.message, type: 'network_error', url });
        }
        throw err;
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      window.fetch = origFetch; // restore original fetch on unmount
    };
  }, []);

  return null; // renders nothing
}
