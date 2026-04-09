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
    scrollEnabled: true, // Changed from false - was blocking input on macOS Catalyst
    allowsLinkPreview: false,
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true, // This bypasses CORS on iOS by using native HTTP
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#F4F5F9',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      // Keep the native launch screen visible until React has mounted and
      // calls SplashScreen.hide() — eliminates the white flash between the
      // native splash and the React skeleton.
      launchAutoHide: false,
      backgroundColor: '#F4F5F9',
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;