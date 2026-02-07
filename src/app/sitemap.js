import { siteConfig } from '@/lib/seo-config';

const isStandalone = process.env.NEXT_PUBLIC_STANDALONE_ALCHEMY === 'true';

export default function sitemap() {
  const baseUrl = siteConfig.url;
  const currentDate = new Date().toISOString();

  // Generate last 30 days of puzzle archive URLs
  const puzzleUrls = [];
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    puzzleUrls.push({
      url: isStandalone
        ? `${baseUrl}/daily-alchemy?date=${dateStr}`
        : `${baseUrl}/archive/${dateStr}`,
      lastModified: date.toISOString(),
      changeFrequency: 'never',
      priority: 0.6,
    });
  }

  if (isStandalone) {
    return [
      {
        url: baseUrl,
        lastModified: currentDate,
        changeFrequency: 'daily',
        priority: 1.0,
      },
      {
        url: `${baseUrl}/daily-alchemy`,
        lastModified: currentDate,
        changeFrequency: 'daily',
        priority: 1.0,
      },
      {
        url: `${baseUrl}/privacy`,
        lastModified: currentDate,
        changeFrequency: 'yearly',
        priority: 0.3,
      },
      {
        url: `${baseUrl}/terms`,
        lastModified: currentDate,
        changeFrequency: 'yearly',
        priority: 0.3,
      },
      ...puzzleUrls,
    ];
  }

  return [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/how-to-play`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/archive`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/stats`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    ...puzzleUrls,
  ];
}
