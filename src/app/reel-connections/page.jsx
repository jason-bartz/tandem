import ReelConnectionsGame from '@/components/reel-connections/ReelConnectionsGame';
import { Righteous } from 'next/font/google';

const righteous = Righteous({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata = {
  title: 'Reel Connections - Movie Puzzle Game',
  description:
    'Create four groups of four movies that share something in common. A daily movie trivia game.',
  keywords: ['movie game', 'film trivia', 'connections', 'puzzle', 'daily game', 'cinema'],
  openGraph: {
    title: 'Reel Connections - Movie Puzzle Game',
    description:
      'Create four groups of four movies that share something in common. Test your film knowledge!',
    type: 'website',
    url: 'https://www.tandemdaily.com/reel-connections',
    siteName: 'Tandem Daily',
    images: [
      {
        url: '/images/reel-connections-og.png',
        width: 1200,
        height: 630,
        alt: 'Reel Connections Game Board',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reel Connections - Movie Puzzle Game',
    description: 'Create four groups of four movies that share something in common.',
    images: ['/images/reel-connections-og.png'],
  },
  themeColor: '#1a1a2e',
};

export default function ReelConnectionsPage() {
  return (
    <div className="min-h-screen bg-[#1a1a2e]" style={{ backgroundColor: '#1a1a2e' }}>
      <ReelConnectionsGame titleFont={righteous.className} />
    </div>
  );
}
