'use client';
import { useEffect } from 'react';

const BACKEND = 'https://xtox-production.up.railway.app';
// C5: VAPID public key — must match backend VAPID_PUBLIC_KEY env var (or hardcoded fallback)
const VAPID_DEFAULT = 'BCTRfwu1JjM-5_-xGHauSSiVOBd6dkyEJJp3L57_-C6B-oDQW2IAmcnEVpwsGAsvmhBsvWLu9tMHe29zmcOn0UU';

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

    const token = typeof localStorage !== 'undefined' ? (localStorage.getItem('xtox_token') || localStorage.getItem('token')) : null;
    if (!token) return;

    // FIX: Only auto-subscribe if permission is ALREADY granted.
    // Do NOT call requestPermission() on mount — that prompts the user uninvited.
    // Do NOT show any toast on mount — the disabled toast must only show when
    // the user explicitly clicks an "Enable notifications" button AND gets 'denied'.
    if (Notification.permission !== 'granted') {
      // If permission was explicitly denied, the caller (a button handler) is responsible
      // for showing the disabled toast — NOT this auto-run effect.
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (cancelled) return;

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

        // Unsubscribe any existing subscription before subscribing fresh.
        // This prevents the "A subscription with a different applicationServerKey already exists"
        // error that occurs when the VAPID key changes between deployments.
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          try { await existing.unsubscribe(); } catch (_unsubErr) { /* non-fatal */ }
        }

        if (cancelled) return;

        // Subscribe fresh with current VAPID key
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });

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
