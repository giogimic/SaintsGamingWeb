import { MetadataRoute } from 'next';
import { prisma } from '@/web/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.saintsgaming.net';

  // Base static routes with structured priority for search engine sitelinks
  const staticRoutes = [
    { route: '', priority: 1.0, changeFrequency: 'daily' as const },
    { route: '/forum', priority: 0.9, changeFrequency: 'hourly' as const },
    { route: '/news', priority: 0.9, changeFrequency: 'daily' as const },
    { route: '/streams', priority: 0.9, changeFrequency: 'daily' as const },
    { route: '/modpacks', priority: 0.9, changeFrequency: 'weekly' as const },
    { route: '/lobby', priority: 0.8, changeFrequency: 'weekly' as const },
    { route: '/servers', priority: 0.7, changeFrequency: 'daily' as const },
    { route: '/support', priority: 0.6, changeFrequency: 'monthly' as const },
    { route: '/login', priority: 0.5, changeFrequency: 'monthly' as const },
    { route: '/register', priority: 0.5, changeFrequency: 'monthly' as const },
  ].map(({ route, priority, changeFrequency }) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
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
