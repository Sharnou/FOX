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
        PushNotifications.addListener('pushNotificationReceived', async (n) => {
          if (n.data?.type === 'call') {
            // BUG FIX: PushNotifications.schedule() does not exist in @capacitor/push-notifications.
            // Use @capacitor/local-notifications instead to show a sticky in-app call notification.
            try {
              const { LocalNotifications } = await import('@capacitor/local-notifications');
              await LocalNotifications.schedule({
                notifications: [{
                  title: `${n.data.name || 'Someone'} is calling`,
                  body: 'Tap to answer',
                  id: parseInt(n.data.uuid) || 1,
                  sound: 'default',
                  channelId: 'voip_calls',
                  extra: n.data,
                  ongoing: true,
                  autoCancel: false,
                }],
              });
            } catch (schedErr) {
              // Graceful fallback: @capacitor/local-notifications not available
              console.debug('[FCMInit] LocalNotifications unavailable:', schedErr?.message);
            }
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
