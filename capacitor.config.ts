import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.pufferpop.game',
    appName: 'Puffer Pop',
    webDir: 'dist',
    server: {
        androidScheme: 'https',
    },
};

export default config;
