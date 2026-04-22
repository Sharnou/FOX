import { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.xtox.voicecall',
  appName: 'XTOX',
  webDir: 'out',
  server: { androidScheme: 'https' },
  android: {
    ignoredPlugins: ['@capacitor-community/fcm'],
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};
export default config;
