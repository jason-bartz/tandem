const isStandalone = process.env.NEXT_PUBLIC_STANDALONE_ALCHEMY === 'true';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tandemdaily.com';

export const siteConfig = isStandalone
  ? {
      name: 'Daily Alchemy',
      title: 'Daily Alchemy | Element Combination Puzzle Game',
      titleTemplate: '%s | Daily Alchemy',
      description:
        'Combine elements to discover new ones and reach the daily target. A free daily puzzle game where you mix and match elements to create compounds. New puzzle every day at midnight.',
      shortDescription: 'Combine elements to reach the daily target - free daily puzzle',
      url: baseUrl,
      ogImage: `${baseUrl}/images/dailyalchemy-og.png`,
      twitterImage: `${baseUrl}/images/dailyalchemy-og.png`,
      locale: 'en_US',
      type: 'website',
      keywords: [
        'daily alchemy',
        'element combination game',
        'alchemy puzzle',
        'daily puzzle game',
        'element mixing game',
        'combination puzzle',
        'free puzzle game',
        'daily challenge',
        'brain teaser',
        'element discovery game',
        'crafting game',
        'alchemy game online',
        'little alchemy alternative',
        'element game',
        'free daily game',
      ],
      authors: [{ name: 'Daily Alchemy', url: baseUrl }],
      creator: 'Daily Alchemy',
      publisher: 'Daily Alchemy',
      category: 'Games',
      classification: 'Puzzle Game',
      twitter: {
        card: 'summary_large_image',
        site: '@dailyalchemy',
        creator: '@dailyalchemy',
      },
      themeColors: {
        light: '#7ed957', // soup-primary green
        dark: '#5cb83c',
      },
      appleStatusBar: 'black-translucent',
      verification: {
        google: '',
        bing: '',
        yandex: '',
        pinterest: '',
      },
    }
  : {
      name: 'Tandem',
      title: 'Tandem | Daily Word Games, Mini Crosswords & More',
      titleTemplate: '%s | Tandem',
      description:
        'Tandem Daily Games: Free daily word puzzles including Mini Crosswords, emoji word games, and Reel Connections. Fresh twists on favorites like Wordle and NYT Connections. New puzzles every day at midnight.',
      shortDescription: 'Daily word games: Mini Crosswords, emoji puzzles, and more',
      url: baseUrl,
      ogImage: `${baseUrl}/images/tandem-og.png`,
      twitterImage: `${baseUrl}/images/tandem-og.png`,
      locale: 'en_US',
      type: 'website',
      keywords: [
        // Primary game keywords
        'daily word games',
        'mini crossword',
        'free mini crossword',
        'daily crossword',
        'word puzzle',
        'daily puzzle',
        // Wordle/Connections-related keywords
        'wordle alternative',
        'games like wordle',
        'nyt connections alternative',
        'connections game',
        'like wordle',
        'similar to wordle',
        'daily wordle alternative',
        // Core game keywords
        'emoji game',
        'word game',
        'brain teaser',
        'daily challenge',
        'puzzle game',
        'tandem daily games',
        'free word game',
        'online puzzle',
        'daily word game',
        'movie trivia game',
        'reel connections',
        'brain training',
        'emoji word puzzle',
        'word guessing game',
        'daily brain teaser',
      ],
      authors: [
        {
          name: 'Tandem Game',
          url: 'https://tandemdaily.com',
        },
      ],
      creator: 'Tandem Game',
      publisher: 'Tandem Game',
      category: 'Games',
      classification: 'Puzzle Game',

      // Social Media
      twitter: {
        card: 'summary_large_image',
        site: '@tandemgame',
        creator: '@tandemgame',
      },

      // Theme colors for different contexts
      themeColors: {
        light: '#0EA5E9', // Sky-500
        dark: '#14B8A6', // Teal-600
      },

      // Apple specific
      appleStatusBar: 'black-translucent',

      // Verification codes (add your actual codes when ready)
      verification: {
        google: '', // Google Search Console verification
        bing: '', // Bing Webmaster Tools
        yandex: '', // Yandex
        pinterest: '', // Pinterest
      },
    };

// Generate dynamic metadata based on puzzle info
export function generatePuzzleMetadata(puzzleInfo) {
  const puzzleNumber = puzzleInfo?.puzzleNumber || '';
  const theme = puzzleInfo?.puzzle?.theme || '';
  const date =
    puzzleInfo?.displayDate ||
    new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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
          type: 'image/png',
        },
      ],
    },
    twitter: {
      title: `Tandem ${puzzleNumber ? `#${puzzleNumber}` : 'Daily Puzzle'}`,
      description: description.substring(0, 200),
      images: [siteConfig.twitterImage],
    },
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
          '@id': `${siteConfig.url}/#organization`,
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${siteConfig.url}/?s={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
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
          height: 512,
        },
        sameAs: [
          // Add your social media URLs here
          // 'https://twitter.com/tandemgame',
          // 'https://facebook.com/tandemgame',
          // 'https://instagram.com/tandemgame'
        ],
      },
      {
        '@type': 'WebPage',
        '@id': `${siteConfig.url}/#webpage`,
        url: siteConfig.url,
        name: siteConfig.title,
        isPartOf: {
          '@id': `${siteConfig.url}/#website`,
        },
        about: {
          '@id': `${siteConfig.url}/#game`,
        },
        description: siteConfig.description,
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
          maxValue: 1,
        },
        playMode: 'SinglePlayer',
        applicationCategory: 'GameApplication',
        applicationSubCategory: 'Puzzle Game',
        operatingSystem: 'Any',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          ratingCount: '1250',
          bestRating: '5',
          worstRating: '1',
        },
      },
    ],
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
        '@id': `${siteConfig.url}/#organization`,
      },
      isPartOf: {
        '@id': `${siteConfig.url}/#game`,
      },
    });
  }

  return baseStructuredData;
}

// Generate alternate language links (for international SEO)
export function generateAlternateLinks() {
  // Add more languages as you expand
  return [
    { hrefLang: 'en', href: siteConfig.url },
    { hrefLang: 'x-default', href: siteConfig.url },
  ];
}

// Generate breadcrumb structured data
export function generateBreadcrumbs(path = []) {
  const items = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: siteConfig.url,
    },
  ];

  path.forEach((item, index) => {
    items.push({
      '@type': 'ListItem',
      position: index + 2,
      name: item.name,
      item: `${siteConfig.url}${item.path}`,
    });
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

// Generate FAQ structured data for SEO
export function generateFAQSchema() {
  if (isStandalone) {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How do you play Daily Alchemy?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Combine elements to create new ones and reach the daily target element. Start with basic elements like Water, Fire, Earth, and Air, then mix them together to discover new compounds. You have 10 minutes and a par number of moves to reach the target.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is Daily Alchemy free to play?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes! Daily Alchemy is completely free to play, including the full archive of past puzzles and Creative Mode. A new puzzle is released every day at midnight.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is Creative Mode?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Creative Mode lets you combine elements endlessly with no goal or timer. Discover new elements at your own pace with pure experimentation and discovery.',
          },
        },
        {
          '@type': 'Question',
          name: 'When are new Daily Alchemy puzzles released?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'A new Daily Alchemy puzzle is released every day at midnight Eastern Time. Come back daily for a fresh target element to discover!',
          },
        },
      ],
    };
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Is Tandem like Wordle?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "Tandem is a Wordle-style game with a unique emoji twist! While Wordle challenges you to guess a 5-letter word, Tandem presents emoji pairs that represent words. You have to decode what the emojis mean together. Like Wordle, it's free, has a new puzzle daily at midnight, and you can share your results with friends.",
        },
      },
      {
        '@type': 'Question',
        name: 'How is Tandem different from Wordle?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Unlike Wordle where you guess letters, Tandem shows you emoji pairs and you type the full word they represent. Each daily puzzle has 4 emoji pairs with a connecting theme. You get smart hints - when you guess wrong, correct letters lock in green, so you only fill in the remaining blanks. You start with 1 hint and can unlock a second after solving 2 puzzles.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do you play Tandem?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Each puzzle shows two emojis that represent a single word. Type your guess and press Enter. You have 4 mistakes total across all puzzles. When you guess incorrectly, any letters in the correct position turn green and stay locked - just fill in the remaining blanks. The theme is revealed when you solve all four emoji pairs.',
        },
      },
      {
        '@type': 'Question',
        name: 'When are new Tandem puzzles released?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'A new Tandem puzzle is released every day at midnight in your local timezone, just like Wordle. Come back daily for a fresh challenge!',
        },
      },
      {
        '@type': 'Question',
        name: 'Is Tandem free to play?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "Yes! Tandem is completely free to play. You get one new puzzle every day at midnight. For unlimited access to past puzzles and Hard Mode, there's an optional Tandem Puzzle Club membership available.",
        },
      },
      {
        '@type': 'Question',
        name: 'Can I share my Tandem results like Wordle?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! After completing a puzzle, you can share your results with friends, similar to Wordle. Show off your solving skills and compare scores!',
        },
      },
      {
        '@type': 'Question',
        name: 'What are the best Wordle alternatives?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Tandem is one of the best Wordle alternatives if you enjoy word puzzles with a visual twist. It combines emoji decoding with word association, offering a fresh challenge while maintaining the daily puzzle format that made Wordle popular. Other popular Wordle alternatives include Quordle, Octordle, and Semantle.',
        },
      },
    ],
  };
}
