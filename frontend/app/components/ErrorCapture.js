'use client';
import { useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox.up.railway.app';

async function reportError(data) {
  try {
    await fetch(`${API}/api/errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, userAgent: navigator.userAgent, url: location.href }),
    });
  } catch {} // never throw
}

export default function ErrorCapture() {
  useEffect(() => {
    // Capture all JS errors
    const handleError = (e) => {
      reportError({ message: e.message, stack: e.error?.stack, type: 'js_error' });
    };
    // Capture unhandled promise rejections
    const handleRejection = (e) => {
      const msg = e.reason?.message || String(e.reason);
      reportError({ message: msg, stack: e.reason?.stack, type: 'unhandled_rejection' });
    };
    // Intercept fetch errors globally
    const origFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const res = await origFetch(...args);
        if (!res.ok && res.status >= 500) {
          reportError({ 
            message: `API ${res.status}: ${args[0]}`, 
            type: 'api_error',
            url: typeof args[0] === 'string' ? args[0] : args[0]?.url
          });
        }
        return res;
      } catch (err) {
        reportError({ message: err.message, type: 'network_error', url: typeof args[0] === 'string' ? args[0] : '' });
        throw err;
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      window.fetch = origFetch;
    };
  }, []);

  return null; // renders nothing
}
