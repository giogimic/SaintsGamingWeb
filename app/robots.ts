import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.saintsgaming.net';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/ucp/',
        '/profile/',
        '/api/',
        '/forum/*/new',
        '/reset-password',
        '/forgot-password'
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
