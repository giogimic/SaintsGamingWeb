import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.saintsgaming.net';

  // Base static routes
  const staticRoutes = [
    '',
    '/news',
    '/forum',
    '/modpacks',
    '/servers',
    '/support',
    '/login',
    '/register'
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // Dynamic News Articles
  const news = await prisma.newsArticle.findMany({
    where: { isPublished: true },
    select: { slug: true, updatedAt: true },
  });

  const newsRoutes = news.map((article) => ({
    url: `${baseUrl}/news/${article.slug}`,
    lastModified: article.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Dynamic Modpacks
  const modpacks = await prisma.modpack.findMany({
    where: { status: 'Active' },
    select: { slug: true, updatedAt: true },
  });

  const modpackRoutes = modpacks.map((pack) => ({
    url: `${baseUrl}/modpacks/${pack.slug}`,
    lastModified: pack.updatedAt,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  // Dynamic Forum Categories
  const subcategories = await prisma.subCategory.findMany({
    where: { isLocked: false, reqVIP: false, reqFounder: false, reqTrusted: false },
    select: { slug: true },
  });

  const forumRoutes = subcategories.map((sub) => ({
    url: `${baseUrl}/forum/${sub.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.6,
  }));

  // Public Threads
  const threads = await prisma.thread.findMany({
    where: {
      subcategory: { isLocked: false, reqVIP: false, reqFounder: false, reqTrusted: false },
    },
    select: { slug: true, updatedAt: true },
    take: 1000, // Limit to prevent massive sitemaps
    orderBy: { updatedAt: 'desc' },
  });

  const threadRoutes = threads.map((thread) => ({
    url: `${baseUrl}/forum/t/${thread.slug}`,
    lastModified: thread.updatedAt,
    changeFrequency: 'daily' as const,
    priority: 0.5,
  }));

  // Public User Profiles
  const users = await prisma.user.findMany({
    select: { username: true, updatedAt: true },
    take: 5000,
  });

  const userRoutes = users.map((u) => ({
    url: `${baseUrl}/user/${encodeURIComponent(u.username)}`,
    lastModified: u.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [
    ...staticRoutes,
    ...newsRoutes,
    ...modpackRoutes,
    ...forumRoutes,
    ...threadRoutes,
    ...userRoutes,
  ];
}
