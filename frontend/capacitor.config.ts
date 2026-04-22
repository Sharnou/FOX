import { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.xtox.voicecall',
  appName: 'XTOX',
  webDir: 'out',
  server: {
    url: 'https://fox-kohl-eight.vercel.app',
    cleartext: false,
    androidScheme: 'https'
  },
  plugins: {
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
  },
};
export default config;
