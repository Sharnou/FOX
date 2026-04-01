'use client';
// NotificationOptIn.js
// Shows a subtle banner asking users to enable push notifications (Arabic RTL).
// NOTE: This component handles the browser Notification permission flow only.
//       For full Firebase Cloud Messaging (FCM) integration, you need to:
//         1. Install firebase: `npm install firebase`
//         2. Configure your Firebase project (firebaseConfig)
//         3. Call `getToken(messaging, { vapidKey: YOUR_VAPID_KEY })` after permission is granted
//         4. Send that token to your backend to store it for targeted pushes

import { useState, useEffect } from 'react';

const DISMISSED_KEY = 'xtox_notif_dismissed';

export default function NotificationOptIn() {
  const [visible, setVisible] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Only show in browsers that support the Notifications API
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;

    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    // Only show if permission hasn't been decided yet
    if (Notification.permission === 'default') {
      // Small delay so it doesn't pop immediately on page load
      const timer = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  async function handleYes() {
    setVisible(false);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // TODO: After integrating Firebase SDK, call getToken(messaging, { vapidKey }) here
        // and send the token to your backend API endpoint, e.g.:
        //   const token = await getToken(messaging, { vapidKey: 'YOUR_VAPID_PUBLIC_KEY' });
        //   await fetch('/api/notifications/subscribe', { method: 'POST', body: JSON.stringify({ token }) });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      }
    } catch (err) {
      // Permission request failed or was denied — silently ignore
      console.warn('Notification permission error:', err);
    }
    localStorage.setItem(DISMISSED_KEY, '1');
  }

  function handleLater() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  }

  return (
    <>
      {/* ── Notification opt-in banner ── */}
      {visible && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="طلب تفعيل الإشعارات"
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm"
        >
          <div className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-2xl border border-gray-100">
            {/* Bell icon */}
            <span className="flex-shrink-0 text-2xl mt-0.5" aria-hidden="true">🔔</span>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 leading-snug mb-0.5"
                 style={{ fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif" }}>
                إشعارات XTOX
              </p>
              <p className="text-xs text-gray-600 leading-relaxed"
                 style={{ fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif" }}>
                هل تريد تلقي إشعارات عن الإعلانات الجديدة؟
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={handleLater}
              aria-label="إغلاق"
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>

          {/* Action buttons */}
          <div className="mt-2 flex gap-2 justify-end">
            <button
              onClick={handleLater}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              style={{ fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif" }}
            >
              لاحقاً
            </button>
            <button
              onClick={handleYes}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{
                background: 'linear-gradient(135deg, #002f34, #00b09b)',
                fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif",
              }}
            >
              نعم، فعّل الإشعارات
            </button>
          </div>
        </div>
      )}

      {/* ── Success toast ── */}
      {success && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm"
        >
          <div className="flex items-center gap-3 rounded-xl bg-emerald-600 px-4 py-3 shadow-xl">
            <span className="text-xl" aria-hidden="true">✅</span>
            <p className="text-sm font-semibold text-white"
               style={{ fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif" }}>
              تم تفعيل الإشعارات بنجاح! ستتلقى تنبيهات عن أحدث الإعلانات.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
