'use client';
import { useEffect } from 'react';

const BACKEND = 'https://xtox-production.up.railway.app';
// C5: VAPID public key — must match backend VAPID_PUBLIC_KEY env var (or hardcoded fallback)
const VAPID_DEFAULT = 'BF4po3DK_lsqgzuEJ1Su7WSdxXX8xkzjnDQYF3tpe4DftSO6KRh5heBWOSYfef4A76iV1AX4H20hGPiDzo7IIrs';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export default function PushSubscriber() {
  useEffect(() => {
    // Only run in browser with service worker + push support
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const token = typeof localStorage !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('xtox_token')) : null;
    if (!token) return;

    let cancelled = false;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (cancelled) return;

        // Check if already subscribed — avoid re-subscribing on every mount
        let sub = await reg.pushManager.getSubscription();

        if (!sub) {
          // Request notification permission first
          const perm = await Notification.requestPermission();
          if (perm !== 'granted' || cancelled) return;

          // Get VAPID public key from backend (with fallback to hardcoded key)
          let vapidKey = VAPID_DEFAULT;
          try {
            const res = await fetch(`${BACKEND}/api/push/vapid-public-key`, { signal: AbortSignal.timeout(5000) });
            if (res.ok) {
              const json = await res.json();
              if (json.key) vapidKey = json.key;
            }
          } catch { /* use hardcoded default */ }

          if (cancelled) return;

          // Subscribe to push notifications
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          });
        }

        if (!sub || cancelled) return;

        // Save subscription to backend
        await fetch(`${BACKEND}/api/push/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ subscription: sub.toJSON() }),
          signal: AbortSignal.timeout(8000),
        }).catch(() => { /* non-fatal — will retry next time */ });

      } catch (err) {
        // Non-fatal: push subscription failures should never crash the app
        if (err.name !== 'AbortError') {
          console.warn('[PushSubscriber] Push setup failed:', err.message);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // This component renders nothing — it's a side-effect only component
  return null;
}
