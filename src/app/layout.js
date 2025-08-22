import './globals.css'
import { Inter } from 'next/font/google'
import { siteConfig } from '@/lib/seo-config'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial']
})

export const metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: siteConfig.authors,
  creator: siteConfig.creator,
  publisher: siteConfig.publisher,
  formatDetection: {
    email: false,
    address: false,
    telephone: false
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
        alt: `${siteConfig.name} - Daily Emoji Word Puzzle Game`,
        type: 'image/webp'
      }
    ],
    locale: siteConfig.locale,
    type: siteConfig.type
  },
  
  // Twitter
  twitter: {
    card: siteConfig.twitter.card,
    title: siteConfig.title,
    description: siteConfig.shortDescription,
    site: siteConfig.twitter.site,
    creator: siteConfig.twitter.creator,
    images: [siteConfig.twitterImage]
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
      'max-snippet': -1
    }
  },
  
  // Icons
  icons: {
    icon: [
      { url: '/favicon.ico?v=2', sizes: 'any' },
      { url: '/icons/favicon-16x16.png?v=2', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32x32.png?v=2', sizes: '32x32', type: 'image/png' },
      { url: '/icons/android-chrome-192x192.png?v=2', sizes: '192x192', type: 'image/png' },
      { url: '/icons/android-chrome-512x512.png?v=2', sizes: '512x512', type: 'image/png' }
    ],
    shortcut: '/favicon.ico?v=2',
    apple: [
      { url: '/icons/apple-touch-icon.png?v=2', sizes: '180x180' }
    ]
  },
  
  // Manifest
  manifest: '/site.webmanifest',
  
  // Alternate languages
  alternates: {
    canonical: siteConfig.url,
    languages: {
      'en-US': siteConfig.url
    }
  },
  
  // App specific
  applicationName: siteConfig.name,
  referrer: 'origin-when-cross-origin',
  
  // Apple specific
  appleWebApp: {
    capable: true,
    statusBarStyle: siteConfig.appleStatusBar,
    title: siteConfig.name
  },
  
  // Verification
  verification: siteConfig.verification,
  
  // Category
  category: siteConfig.category,
  classification: siteConfig.classification
}

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: siteConfig.themeColors.light },
    { media: '(prefers-color-scheme: dark)', color: siteConfig.themeColors.dark }
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  colorScheme: 'light dark'
}

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
      priceCurrency: 'USD'
    }
  }
  
  return (
    <html 
      lang="en" 
      suppressHydrationWarning
      className="scroll-smooth"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        
        {/* Preload critical resources */}
        <link rel="preload" href="/images/main-logo.webp" as="image" type="image/webp" />
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  )
}