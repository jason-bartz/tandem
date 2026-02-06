import DailyAlchemyFavicon from './DailyAlchemyFavicon';

const isStandalone = process.env.NEXT_PUBLIC_STANDALONE_ALCHEMY === 'true';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tandemdaily.com';

/**
 * Daily Alchemy Layout
 *
 * Provides page-specific Open Graph metadata and dynamic favicon switching
 * for the Daily Alchemy game route.
 */

export const metadata = {
  title: 'Daily Alchemy - Element Combination Puzzle Game',
  description: 'Combine elements to discover new ones and reach the daily target.',
  openGraph: {
    title: 'Daily Alchemy - Element Combination Puzzle Game',
    description: 'Combine elements to discover new ones and reach the daily target.',
    type: 'website',
    url: isStandalone ? siteUrl : `${siteUrl}/daily-alchemy`,
    siteName: isStandalone ? 'Daily Alchemy' : 'Tandem Daily',
    images: [
      {
        url: '/images/dailyalchemy-og.png',
        width: 1200,
        height: 630,
        alt: 'Daily Alchemy Game',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Daily Alchemy - Element Combination Puzzle Game',
    description: 'Combine elements to discover new ones and reach the daily target.',
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
