import './globals.css';
import '@/styles/ios-optimizations.css';
import localFont from 'next/font/local';
import { Jua, Lilita_One } from 'next/font/google';
// Script import removed - not currently used
import { siteConfig, generateFAQSchema } from '@/lib/seo-config';
import IOSContainerWrapper from '@/components/shared/IOSContainerWrapper';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import AuthModalManager from '@/components/auth/AuthModalManager';
import PaywallModalManager from '@/components/PaywallModalManager';
import FirstTimeSetupManager from '@/components/FirstTimeSetupManager';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ASSET_VERSION } from '@/lib/constants';
import PostHogProvider from '@/components/providers/PostHogProvider';
import { isStandaloneAlchemy } from '@/lib/standalone';

// Plus Jakarta Sans - Variable font for optimal performance
// Following Apple HIG: Use variable fonts when available for better scaling
const plusJakartaSans = localFont({
  src: [
    {
      path: '../../public/fonts/PlusJakartaSans-VariableFont_wght.ttf',
      style: 'normal',
    },
    {
      path: '../../public/fonts/PlusJakartaSans-Italic-VariableFont_wght.ttf',
      style: 'italic',
    },
  ],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
  preload: true,
  // Apple HIG: Always provide system fallbacks for accessibility
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
  // Adjust font metrics for better optical alignment (Apple HIG recommendation)
  adjustFontFallback: 'Arial',
});

const jua = Jua({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-jua',
  display: 'swap',
});

const lilitaOne = Lilita_One({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-lilita-one',
  display: 'swap',
});

export const metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  authors: siteConfig.authors,
  creator: siteConfig.creator,
  publisher: siteConfig.publisher,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  // Open Graph
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} - Daily Word Games`,
        type: 'image/png',
      },
    ],
    locale: siteConfig.locale,
    type: siteConfig.type,
  },

  // Twitter
  twitter: {
    card: siteConfig.twitter.card,
    title: siteConfig.title,
    description: siteConfig.shortDescription,
    site: siteConfig.twitter.site,
    creator: siteConfig.twitter.creator,
    images: [siteConfig.twitterImage],
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Icons
  icons: {
    icon: [
      { url: '/favicon.ico?v=2', sizes: 'any' },
      { url: '/favicons/tandem/favicon-16x16.png?v=2', sizes: '16x16', type: 'image/png' },
      { url: '/favicons/tandem/favicon-32x32.png?v=2', sizes: '32x32', type: 'image/png' },
      {
        url: '/favicons/tandem/android-chrome-192x192.png?v=2',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/favicons/tandem/android-chrome-512x512.png?v=2',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    shortcut: '/favicon.ico?v=2',
    apple: [{ url: '/favicons/tandem/apple-touch-icon.png?v=2', sizes: '180x180' }],
  },

  // Manifest
  manifest: '/site.webmanifest',

  // Alternate languages
  alternates: {
    canonical: siteConfig.url,
    languages: {
      'en-US': siteConfig.url,
    },
  },

  // App specific
  applicationName: siteConfig.name,
  referrer: 'origin-when-cross-origin',

  // Apple specific
  appleWebApp: {
    capable: true,
    statusBarStyle: siteConfig.appleStatusBar,
    title: siteConfig.name,
  },

  // Verification
  verification: siteConfig.verification,

  // Category
  category: siteConfig.category,
  classification: siteConfig.classification,
};

// Force dynamic rendering for all pages — the app uses browser-only auth
// (Supabase client, useSearchParams) that cannot be statically prerendered.
export const dynamic = 'force-dynamic';

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: siteConfig.themeColors.light },
    { media: '(prefers-color-scheme: dark)', color: siteConfig.themeColors.dark },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  colorScheme: 'light dark',
};

export default function RootLayout({ children }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  const faqSchema = generateFAQSchema();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`scroll-smooth ${jua.variable} ${lilitaOne.variable}${isStandaloneAlchemy ? ' standalone-alchemy' : ''}`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />

        {/* Preload game icons for instant display on home page */}
        {!isStandaloneAlchemy && (
          <>
            <link rel="preload" href="/ui/games/tandem.png" as="image" type="image/png" />
            <link rel="preload" href="/ui/games/mini.png" as="image" type="image/png" />
            <link rel="preload" href="/ui/games/movie.png" as="image" type="image/png" />
          </>
        )}
        <link
          rel="preload"
          href={
            isStandaloneAlchemy
              ? `/branding/daily-alchemy-logo.png?v=${ASSET_VERSION}`
              : `/ui/games/daily-alchemy.png?v=${ASSET_VERSION}`
          }
          as="image"
          type="image/png"
        />

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {/* FAQ Schema for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        {/* Google Analytics */}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
            ></script>
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
                `,
              }}
            />
          </>
        )}
      </head>
      <body className={`${plusJakartaSans.className} antialiased`}>
        {/* Cordova scripts are automatically injected by Capacitor WebView - do NOT load manually */}
        <PostHogProvider>
          <ErrorBoundary name="RootLayout">
            <ThemeProvider>
              <AuthProvider>
                <SubscriptionProvider>
                  <IOSContainerWrapper>{children}</IOSContainerWrapper>
                  <AuthModalManager />
                  {!isStandaloneAlchemy && <PaywallModalManager />}
                  <FirstTimeSetupManager />
                </SubscriptionProvider>
              </AuthProvider>
            </ThemeProvider>
          </ErrorBoundary>
        </PostHogProvider>
        {/* Vercel Analytics - only for web builds */}
        {process.env.BUILD_TARGET !== 'capacitor' && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  );
}
