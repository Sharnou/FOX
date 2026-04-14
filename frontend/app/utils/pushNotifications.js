'use client';

/**
 * Register the user for Web Push notifications.
 * Call this after the user logs in and the auth token is available.
 * Requires NEXT_PUBLIC_VAPID_PUBLIC_KEY to be set in .env.local
 */
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

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.warn('[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set — skipping push registration');
      return;
    }

    // Subscribe to push
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    // Send subscription to backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
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

/** Convert URL-safe base64 VAPID public key to Uint8Array */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}
