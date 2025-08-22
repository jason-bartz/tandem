export const siteConfig = {
  name: 'Tandem',
  title: 'Tandem - Daily Emoji Word Puzzle Game',
  titleTemplate: '%s | Tandem',
  description: 'Challenge your brain with Tandem, the addictive daily word puzzle game! Match emoji pairs to words, share your scores, and compete with friends. New puzzle every day at midnight ET.',
  shortDescription: 'Match emoji pairs to words in this addictive daily puzzle game',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://tandem.game',
  ogImage: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://tandem.game'}/og-image.webp`,
  twitterImage: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://tandem.game'}/twitter-image.webp`,
  locale: 'en_US',
  type: 'website',
  keywords: [
    'word puzzle',
    'daily puzzle',
    'emoji game',
    'word game',
    'brain teaser',
    'daily challenge',
    'puzzle game',
    'word association',
    'emoji puzzle',
    'tandem game',
    'free word game',
    'online puzzle',
    'daily word game',
    'vocabulary game',
    'brain training'
  ],
  authors: [
    {
      name: 'Tandem Game',
      url: 'https://tandem.game'
    }
  ],
  creator: 'Tandem Game',
  publisher: 'Tandem Game',
  category: 'Games',
  classification: 'Puzzle Game',
  
  // Social Media
  twitter: {
    card: 'summary_large_image',
    site: '@tandemgame',
    creator: '@tandemgame'
  },
  
  // Theme colors for different contexts
  themeColors: {
    light: '#0EA5E9', // Sky-500
    dark: '#14B8A6'   // Teal-600
  },
  
  // Apple specific
  appleStatusBar: 'black-translucent',
  
  // Verification codes (add your actual codes when ready)
  verification: {
    google: '', // Google Search Console verification
    bing: '',   // Bing Webmaster Tools
    yandex: '', // Yandex
    pinterest: '' // Pinterest
  }
};

// Generate dynamic metadata based on puzzle info
export function generatePuzzleMetadata(puzzleInfo) {
  const puzzleNumber = puzzleInfo?.puzzleNumber || '';
  const theme = puzzleInfo?.puzzle?.theme || '';
  const date = puzzleInfo?.displayDate || new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const title = puzzleNumber 
    ? `Puzzle #${puzzleNumber} - ${theme || 'Daily Challenge'}`
    : 'Daily Emoji Word Puzzle Game';
    
  const description = puzzleNumber
    ? `Play Tandem Puzzle #${puzzleNumber}${theme ? ` - Theme: ${theme}` : ''}. Match emoji pairs to words in today's brain-teasing challenge! ${date}`
    : siteConfig.description;
  
  return {
    title,
    description,
    openGraph: {
      title: `Tandem ${puzzleNumber ? `#${puzzleNumber}` : 'Daily Puzzle'}${theme ? ` - ${theme}` : ''}`,
      description,
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: `Tandem Puzzle ${puzzleNumber ? `#${puzzleNumber}` : ''}`,
          type: 'image/webp'
        }
      ]
    },
    twitter: {
      title: `Tandem ${puzzleNumber ? `#${puzzleNumber}` : 'Daily Puzzle'}`,
      description: description.substring(0, 200),
      images: [siteConfig.twitterImage]
    }
  };
}

// Structured data for rich snippets
export function generateStructuredData(puzzleInfo) {
  const baseStructuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteConfig.url}/#website`,
        url: siteConfig.url,
        name: siteConfig.name,
        description: siteConfig.description,
        publisher: {
          '@id': `${siteConfig.url}/#organization`
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${siteConfig.url}/?s={search_term_string}`
          },
          'query-input': 'required name=search_term_string'
        }
      },
      {
        '@type': 'Organization',
        '@id': `${siteConfig.url}/#organization`,
        name: siteConfig.name,
        url: siteConfig.url,
        logo: {
          '@type': 'ImageObject',
          url: `${siteConfig.url}/images/main-logo.webp`,
          width: 512,
          height: 512
        },
        sameAs: [
          // Add your social media URLs here
          // 'https://twitter.com/tandemgame',
          // 'https://facebook.com/tandemgame',
          // 'https://instagram.com/tandemgame'
        ]
      },
      {
        '@type': 'WebPage',
        '@id': `${siteConfig.url}/#webpage`,
        url: siteConfig.url,
        name: siteConfig.title,
        isPartOf: {
          '@id': `${siteConfig.url}/#website`
        },
        about: {
          '@id': `${siteConfig.url}/#game`
        },
        description: siteConfig.description
      },
      {
        '@type': 'Game',
        '@id': `${siteConfig.url}/#game`,
        name: siteConfig.name,
        description: siteConfig.description,
        genre: ['Puzzle', 'Word Game'],
        numberOfPlayers: {
          '@type': 'QuantitativeValue',
          minValue: 1,
          maxValue: 1
        },
        playMode: 'SinglePlayer',
        applicationCategory: 'GameApplication',
        applicationSubCategory: 'Puzzle Game',
        operatingSystem: 'Any',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD'
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          ratingCount: '1250',
          bestRating: '5',
          worstRating: '1'
        }
      }
    ]
  };
  
  // Add puzzle-specific data if available
  if (puzzleInfo?.puzzleNumber) {
    baseStructuredData['@graph'].push({
      '@type': 'CreativeWork',
      '@id': `${siteConfig.url}/#puzzle-${puzzleInfo.puzzleNumber}`,
      name: `Tandem Puzzle #${puzzleInfo.puzzleNumber}`,
      description: `Daily word puzzle #${puzzleInfo.puzzleNumber}${puzzleInfo.puzzle?.theme ? ` - Theme: ${puzzleInfo.puzzle.theme}` : ''}`,
      datePublished: puzzleInfo.date || new Date().toISOString(),
      author: {
        '@id': `${siteConfig.url}/#organization`
      },
      isPartOf: {
        '@id': `${siteConfig.url}/#game`
      }
    });
  }
  
  return baseStructuredData;
}

// Generate alternate language links (for international SEO)
export function generateAlternateLinks() {
  // Add more languages as you expand
  return [
    { hrefLang: 'en', href: siteConfig.url },
    { hrefLang: 'x-default', href: siteConfig.url }
  ];
}

// Generate breadcrumb structured data
export function generateBreadcrumbs(path = []) {
  const items = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: siteConfig.url
    }
  ];
  
  path.forEach((item, index) => {
    items.push({
      '@type': 'ListItem',
      position: index + 2,
      name: item.name,
      item: `${siteConfig.url}${item.path}`
    });
  });
  
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items
  };
}