'use client';
import { useEffect } from 'react';

export default function FCMInit() {
  useEffect(() => {
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;
        const { PushNotifications } = await import('@capacitor/push-notifications');
        let perm = await PushNotifications.checkPermissions();
        if (perm.receive === 'prompt') perm = await PushNotifications.requestPermissions();
        if (perm.receive !== 'granted') return;
        await PushNotifications.register();
        PushNotifications.addListener('pushNotificationReceived', (n) => {
          if (n.data?.type === 'call') {
            // Show sticky notification
            PushNotifications.schedule([{
              title: `${n.data.name} is calling`,
              body: 'Tap to answer',
              id: parseInt(n.data.uuid) || 1,
              sound: true,
              vibrate: [300, 100, 300, 100, 300, 100, 300, 100, 300],
              ongoing: true,
              autoCancel: false,
              channelId: 'voip_calls',
              data: n.data,
            }]);
          }
        });
        PushNotifications.addListener('pushNotificationActionPerformed', (a) => {
          if (a.notification.data?.type === 'call')
            window.location.href = '/call?uuid=' + a.notification.data.uuid;
        });
      } catch (e) {
        // Silently fail on web platform (Capacitor not available)
        console.debug('[FCMInit] Not a native platform or Capacitor unavailable', e?.message);
      }
    })();
  }, []);
  return null;
}
