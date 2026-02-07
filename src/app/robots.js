import { siteConfig } from '@/lib/seo-config';

export default function robots() {
  const baseUrl = siteConfig.url;

  return {
    rules: [
      {
        userAgent: '*',
        disallow: ['/api/', '/admin/'],
      },
      {
        userAgent: 'Googlebot',
        disallow: ['/api/', '/admin/'],
      },
      {
        userAgent: 'Bingbot',
        disallow: ['/api/', '/admin/'],
        crawlDelay: 1,
      },
      // Block aggressive SEO crawlers
      {
        userAgent: ['AhrefsBot', 'SemrushBot', 'DotBot', 'MJ12bot'],
        disallow: ['/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
