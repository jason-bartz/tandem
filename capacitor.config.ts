import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tandemdaily.app',
  appName: 'Tandem',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
    hostname: 'localhost',
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scrollEnabled: false,
    allowsLinkPreview: false,
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true, // This bypasses CORS on iOS by using native HTTP
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#F4F5F9',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#F4F5F9',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;