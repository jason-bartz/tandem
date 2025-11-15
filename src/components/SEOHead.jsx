'use client';

import { useEffect } from 'react';
import { siteConfig, generateStructuredData } from '@/lib/seo-config';

export default function SEOHead({
  title,
  description,
  puzzleInfo,
  path = '/',
  image,
  noindex = false,
}) {
  useEffect(() => {
    if (title) {
      document.title = `${title} | ${siteConfig.name}`;
    }

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription && description) {
      metaDescription.content = description;
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && title) {
      ogTitle.content = title;
    }

    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription && description) {
      ogDescription.content = description;
    }

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.content = `${siteConfig.url}${path}`;
    }

    if (image) {
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) {
        ogImage.content = image.startsWith('http') ? image : `${siteConfig.url}${image}`;
      }
    }

    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle && title) {
      twitterTitle.content = title;
    }

    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription && description) {
      twitterDescription.content = description;
    }

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `${siteConfig.url}${path}`;

    if (noindex) {
      let robotsMeta = document.querySelector('meta[name="robots"]');
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.name = 'robots';
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.content = 'noindex, nofollow';
    }

    // Add structured data
    if (puzzleInfo) {
      const structuredData = generateStructuredData(puzzleInfo);
      let scriptTag = document.querySelector('script[type="application/ld+json"]#puzzle-data');

      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.type = 'application/ld+json';
        scriptTag.id = 'puzzle-data';
        document.head.appendChild(scriptTag);
      }

      scriptTag.textContent = JSON.stringify(structuredData);
    }

    // Add performance hints
    const preconnects = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

    preconnects.forEach((url) => {
      if (!document.querySelector(`link[rel="preconnect"][href="${url}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = url;
        if (url.includes('gstatic')) {
          link.crossOrigin = 'anonymous';
        }
        document.head.appendChild(link);
      }
    });
  }, [title, description, path, image, noindex, puzzleInfo]);

  return null;
}
