import { siteConfig } from '@/lib/seo-config';

export const metadata = {
  title: 'About Tandem - The Wordle Alternative with an Emoji Twist',
  description:
    'Discover Tandem, a unique Wordle alternative that combines emoji puzzles with word guessing. Learn how this daily word game puts a creative spin on the classic Wordle format.',
  openGraph: {
    title: 'About Tandem - Wordle Alternative with Emoji Puzzles',
    description:
      'A daily word puzzle game inspired by Wordle, but with emoji pairs. Free to play, new puzzles daily.',
    url: `${siteConfig.url}/about`,
  },
};
