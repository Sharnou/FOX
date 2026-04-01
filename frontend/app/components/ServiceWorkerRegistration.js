'use client';

import { useEffect } from 'react';

/**
 * Registers the XTOX service worker for PWA offline support.
 * Renders nothing — side-effect only component.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register on load to not block page rendering
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            console.log('[XTOX SW] Registered, scope:', registration.scope);

            // Check for updates every hour
            setInterval(() => {
              registration.update();
            }, 60 * 60 * 1000);
          })
          .catch((error) => {
            console.error('[XTOX SW] Registration failed:', error);
          });
      });
    }
  }, []);

  return null;
}
