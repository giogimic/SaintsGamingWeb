import { MetadataRoute } from 'next';
import { prisma } from '@/web/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://www.saintsgaming.net';

  const defaultDisallows = [
    '/admin/',
    '/ucp/',
    '/profile/',
    '/api/',
    '/forum/*/new',
    '/reset-password',
    '/forgot-password',
  ];

  let disallow = defaultDisallows;
  let blockAi = false;

  try {
    const settings = await prisma.siteSetting.findMany({
      where: {
        key: {
          in: ['SEO_ROBOTS_CUSTOM', 'SEO_BLOCK_AI_CRAWLERS', 'SEO_CANONICAL_URL'],
        },
      },
    });

    const configMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    if (configMap['SEO_ROBOTS_CUSTOM']) {
      try {
        const parsed = JSON.parse(configMap['SEO_ROBOTS_CUSTOM']);
        if (Array.isArray(parsed) && parsed.length > 0) {
          disallow = parsed;
        }
      } catch {
        // Fallback to default disallows
      }
    }

    if (configMap['SEO_BLOCK_AI_CRAWLERS'] === 'true') {
      blockAi = true;
    }
  } catch (err) {
    console.error('[Robots] Error reading site settings:', err);
  }

  const aiBots = [
    'GPTBot',
    'ChatGPT-User',
    'ClaudeBot',
    'anthropic-ai',
    'PerplexityBot',
    'CCBot',
    'Google-Extended',
  ];

  const rules: MetadataRoute.Robots['rules'] = [
    {
      userAgent: '*',
      allow: '/',
      disallow,
    },
  ];

  if (blockAi) {
    rules.push({
      userAgent: aiBots,
      disallow: ['/'],
    });
  }

  return {
    rules,
    sitemap: `${baseUrl.replace(/\/$/, '')}/sitemap.xml`,
  };
}
