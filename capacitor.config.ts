import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.digitaldiamonds.pufferfishrun.app',
  appName: 'Pufferfish Run',
  webDir: 'dist',
  plugins: {
    AdMob: {
      appId: 'ca-app-pub-3366446717708247~6010209537',
    },
    SplashScreen: {
      launchShowDuration: 10000, // safety fallback — BootScene calls SplashScreen.hide() first
      launchAutoHide: false,
      backgroundColor: '#4ec0ca',
      showSpinner: false,
    }
  }
};

export default config;
