'use client';

/**
 * Register the user for Web Push notifications.
 * Call this after the user logs in and the auth token is available.
 * Uses NEXT_PUBLIC_VAPID_PUBLIC_KEY env var with hardcoded fallback.
 */

// Hardcoded fallback VAPID key — matches backend VAPID_PUBLIC_KEY
const VAPID_FALLBACK = 'BCTRfwu1JjM-5_-xGHauSSiVOBd6dkyEJJp3L57_-C6B-oDQW2IAmcnEVpwsGAsvmhBsvWLu9tMHe29zmcOn0UU';

export async function registerPushNotifications(token) {
  if (typeof window === 'undefined') return; // SSR guard
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[Push] Web Push not supported in this browser');
    return;
  }

  try {
    // Wait for SW to be ready
    const reg = await navigator.serviceWorker.ready;

    // Request notification permission (will prompt user if not already granted)
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[Push] Notification permission denied');
      return;
    }

    // Use env var with hardcoded fallback so push always works even if env not set
    const vapidPublicKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || VAPID_FALLBACK;

    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    // Try to subscribe; on VAPID key mismatch, unsubscribe + retry once
    const subscription = await subscribePush(reg, applicationServerKey);

    // Send subscription to backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';
    const response = await fetch(`${apiUrl}/api/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ subscription }),
    });

    if (response.ok) {
      console.log('[Push] Successfully subscribed to push notifications ✓');
    } else {
      console.warn('[Push] Subscribe endpoint returned:', response.status);
    }
  } catch (e) {
    console.error('[Push] Registration failed:', e.message);
  }
}

/**
 * Subscribe to push, auto-retrying once if we get a VAPID key mismatch error.
 * The mismatch happens when the browser has an old subscription with a different
 * applicationServerKey. We detect the error, force-unsubscribe, and retry once.
 */
async function subscribePush(reg, applicationServerKey) {
  // Always unsubscribe any existing subscription before resubscribing.
  // This is the primary guard against key mismatch errors.
  const existingSub = await reg.pushManager.getSubscription();
  if (existingSub) {
    try {
      await existingSub.unsubscribe();
      console.log('[Push] Unsubscribed stale subscription before resubscribing');
    } catch (e) {
      console.warn('[Push] Failed to unsubscribe old sub (will retry on error):', e.message);
    }
  }

  try {
    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  } catch (err) {
    // Key mismatch — the unsubscribe above might have failed silently.
    // Detect and retry: unsubscribe + subscribe once more.
    const isKeyMismatch =
      err.name === 'InvalidStateError' ||
      (err.message && err.message.toLowerCase().includes('applicationserverkey'));

    if (isKeyMismatch) {
      console.log('[Push] Key mismatch detected — force unsubscribing and retrying...');
      try {
        const staleSub = await reg.pushManager.getSubscription();
        if (staleSub) {
          await staleSub.unsubscribe();
          console.log('[Push] Force-unsubscribed stale push subscription ✓');
        }
      } catch (_unsubErr) {
        console.warn('[Push] Force-unsubscribe failed:', _unsubErr.message);
      }
      // Retry subscribe once — should succeed now
      return await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    throw err; // re-throw unexpected errors
  }
}

/** Convert URL-safe base64 VAPID public key to Uint8Array */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}
