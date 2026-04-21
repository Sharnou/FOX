'use client';

import { useEffect } from 'react';
import { registerPushNotifications } from '../utils/pushNotifications';

/**
 * Registers the XTOX service worker for PWA offline support.
 * Forces immediate takeover when a new SW is detected:
 *   1. updatefound → new SW installing → send SKIP_WAITING when it reaches 'installed'
 *   2. controllerchange → page reloads once to pick up the fresh JS
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

            // ── Register push notifications after SW is ready ──────────────
            // Give SW a moment to fully activate before subscribing
            setTimeout(() => {
              const token = localStorage.getItem('xtox_token') || localStorage.getItem('token') || '';
              if (token) {
                registerPushNotifications(token).catch(() => {});
              }
            }, 2000);

            // ── Register periodic background sync for presence (WhatsApp-like) ──
            // This allows the SW to ping the server every ~15min to keep lastSeen fresh
            if ('periodicSync' in registration) {
              navigator.serviceWorker.ready.then(async (reg) => {
                try {
                  await reg.periodicSync.register('xtox-presence-ping', {
                    minInterval: 15 * 60 * 1000, // every 15 minutes
                  });
                  console.log('[PWA] Periodic presence sync registered ✓');
                } catch (e) {
                  console.log('[PWA] Periodic sync not supported or denied:', e.message);
                }
              }).catch(() => {});
            }

            // ── Force immediate SW takeover ────────────────────────────────
            // Listen for a new SW installing. When it reaches 'installed'
            // state (meaning it finished installing but is waiting for old
            // tabs to close), send a SKIP_WAITING message to bypass the wait.
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (!newWorker) return;
              newWorker.addEventListener('statechange', () => {
                if (
                  newWorker.state === 'installed' &&
                  navigator.serviceWorker.controller
                ) {
                  // New SW is waiting — tell it to take over NOW
                  console.log('[XTOX SW] New worker installed, sending SKIP_WAITING');
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              });
            });

            // ── Reload page when controller changes ────────────────────────
            // After SKIP_WAITING the browser fires controllerchange.
            // Reload exactly once so the user gets fresh HTML + JS bundles.
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
              if (!refreshing) {
                refreshing = true;
                console.log('[XTOX SW] Controller changed — reloading for fresh content');
                window.location.reload();
              }
            });

            // Check for updates every hour
            setInterval(() => {
              registration.update();
            }, 60 * 60 * 1000);
          })
          .catch((error) => {
          });
      });
    }
  }, []);

  return null;
}
