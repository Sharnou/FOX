'use client';
import { useState, useEffect } from 'react';

/**
 * UnifiedNotificationPrompt
 * Consolidates NotificationOptIn + PushNotificationBanner into a single component.
 * Arabic RTL, orange theme (#FF6B35), Tailwind only.
 * Stores preference in localStorage key: xtox_notif_pref
 * Values: 'granted' | 'denied' | 'dismissed'
 * Shows nothing if user already made a decision.
 */
export default function UnifiedNotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    // Guard: SSR, no Notification API, or permission already set
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      Notification.permission !== 'default'
    ) return;

    const pref = localStorage.getItem('xtox_notif_pref');
    if (pref) return; // user already decided (granted / denied / dismissed)

    // Delay 3 s — non-blocking, won't interrupt initial load
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const handleAllow = async () => {
    setVisible(false);
    try {
      const permission = await Notification.requestPermission();
      localStorage.setItem('xtox_notif_pref', permission);
      if (permission === 'granted') {
        setConfirmed(true);
        // Hide confirmation toast after 4 s
        setTimeout(() => setConfirmed(false), 4000);
        new Notification('XTOX 🔔', {
          body: 'ستصلك إشعارات عند رد البائع أو وصول إعلانات جديدة!',
          icon: '/logo192.png',
        });
      }
    } catch (e) {
      console.error('Notification request error:', e);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem('xtox_notif_pref', 'dismissed');
  };

  // ── Confirmation toast (after granting) ──────────────────────────────────
  if (confirmed) {
    return (
      <div
        dir="rtl"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-2xl bg-orange-50 border border-orange-300 shadow-lg px-4 py-3"
        role="status"
        aria-live="polite"
      >
        <span className="text-lg select-none">✅</span>
        <p className="text-sm font-bold text-orange-700">
          تم تفعيل الإشعارات بنجاح!
        </p>
      </div>
    );
  }

  if (!visible) return null;

  // ── Main notification banner ─────────────────────────────────────────────
  return (
    <div
      dir="rtl"
      className="fixed bottom-4 right-4 left-4 z-50 flex items-center gap-3 rounded-2xl bg-white shadow-xl border border-orange-200 px-4 py-3 md:left-auto md:max-w-sm"
      role="alert"
      aria-live="polite"
    >
      {/* Bell icon */}
      <div className="flex-shrink-0 text-2xl select-none">🔔</div>

      {/* Arabic text */}
      <div className="flex-1 text-right">
        <p className="text-sm font-bold text-gray-800 leading-snug">
          🔔 تفعيل الإشعارات
        </p>
        <p className="text-xs text-gray-500 mt-0.5 leading-snug">
          احصل على إشعارات فورية عند الرد على إعلانك أو وصول رسائل جديدة
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-1 flex-shrink-0">
        <button
          onClick={handleAllow}
          style={{ backgroundColor: '#FF6B35' }}
          className="px-3 py-1 rounded-full text-white text-xs font-bold hover:opacity-90 transition-opacity"
        >
          تفعيل
        </button>
        <button
          onClick={handleDismiss}
          className="px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs hover:bg-gray-200 transition-colors"
        >
          لاحقاً
        </button>
      </div>
    </div>
  );
}
