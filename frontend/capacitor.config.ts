import { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.xtox.voicecall',
  appName: 'XTOX',
  webDir: 'out',
  server: { androidScheme: 'https' },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};
export default config;
