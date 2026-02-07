import DailyAlchemyFavicon from './DailyAlchemyFavicon';

const isStandalone = process.env.NEXT_PUBLIC_STANDALONE_ALCHEMY === 'true';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tandemdaily.com';

/**
 * Daily Alchemy Layout
 *
 * Provides page-specific Open Graph metadata and dynamic favicon switching
 * for the Daily Alchemy game route.
 */

const alchemyTitle = isStandalone
  ? 'Daily Alchemy | Infinite Element Crafting'
  : 'Daily Alchemy - Element Combination Puzzle Game';
const alchemyDescription = isStandalone
  ? 'Free browser alchemy game — combine elements to craft infinite discoveries. Mix fire, water, earth & air to create hundreds of new elements. Daily puzzle + endless Creative Mode.'
  : 'Combine elements to discover new ones and reach the daily target.';

export const metadata = {
  title: alchemyTitle,
  description: alchemyDescription,
  openGraph: {
    title: alchemyTitle,
    description: alchemyDescription,
    type: 'website',
    url: isStandalone ? siteUrl : `${siteUrl}/daily-alchemy`,
    siteName: isStandalone ? 'Daily Alchemy' : 'Tandem Daily',
    images: [
      {
        url: '/images/dailyalchemy-og.png',
        width: 1200,
        height: 630,
        alt: isStandalone ? 'Daily Alchemy - Infinite Element Crafting Game' : 'Daily Alchemy Game',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: alchemyTitle,
    description: alchemyDescription,
    images: ['/images/dailyalchemy-og.png'],
  },
};

export default function DailyAlchemyLayout({ children }) {
  return (
    <>
      <DailyAlchemyFavicon />
      {children}
    </>
  );
}
