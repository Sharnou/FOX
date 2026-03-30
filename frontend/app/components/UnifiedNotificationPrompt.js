'use client';
import { useState, useEffect } from 'react';

/**
 * UnifiedNotificationPrompt
 * Merged from NotificationOptIn + PushNotificationBanner.
 * Prompts the user (Arabic RTL) to enable browser notifications.
 * Stores preference in localStorage key: xtox_notif_pref
 * Values: 'granted' | 'denied' | 'dismissed'
 * Never shown again once a preference is recorded.
 */
export default function UnifiedNotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      Notification.permission !== 'default'
    ) return;

    const pref = localStorage.getItem('xtox_notif_pref');
    if (pref) return; // already made a choice

    // Show banner after 3s delay — non-blocking
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

  // Confirmation toast after granting
  if (confirmed) {
    return (
      <div
        dir="rtl"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-2xl bg-orange-50 border border-orange-300 shadow-lg px-4 py-3"
        role="status"
        aria-live="polite"
      >
        <span className="text-lg">✅</span>
        <p className="text-sm font-bold text-orange-700">تم تفعيل الإشعارات</p>
      </div>
    );
  }

  if (!visible) return null;

  return (
    <div
      dir="rtl"
      className="fixed bottom-4 right-4 left-4 z-50 flex items-center gap-3 rounded-2xl bg-white shadow-xl border border-orange-200 px-4 py-3 md:left-auto md:max-w-sm"
      role="alert"
      aria-live="polite"
    >
      {/* Bell icon */}
      <div className="flex-shrink-0 text-2xl select-none">🔔</div>

      {/* Text */}
      <div className="flex-1 text-right">
        <p className="text-sm font-bold text-gray-800 leading-snug">
          تفعيل الإشعارات
        </p>
        <p className="text-xs text-gray-500 mt-0.5 leading-snug">
          احصل على تنبيه فوري عند رد البائع أو ظهور إعلان جديد يناسبك
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1 flex-shrink-0">
        <button
          onClick={handleAllow}
          className="px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition-colors"
        >
          تفعيل الإشعارات
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
