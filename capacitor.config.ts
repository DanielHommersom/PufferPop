import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pufferpop.app',
  appName: 'Puffer Pop',
  webDir: 'dist',
    plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#4ec0ca',
      showSpinner: false,
    }
  }
};

export default config;
