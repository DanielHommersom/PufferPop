import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pufferpop.app',
  appName: 'Puffer Pop',
  webDir: 'dist',
  plugins: {
    AdMob: {
      appId: 'ca-app-pub-3366446717708247~6010209537',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#4ec0ca',
      showSpinner: false,
    }
  }
};

export default config;
