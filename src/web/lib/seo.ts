import type { Metadata } from "next";

/**
 * Returns the normalized site base URL from environment variables,
 * falling back to NEXTAUTH_URL or canonical default.
 */
export function getSiteBaseUrl(): string {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    (typeof window !== "undefined" ? window.location.origin : "https://saintsgaming.net");
  return envUrl.replace(/\/+$/, "");
}

/**
 * Constructs a canonical URL for a given relative or absolute path.
 */
export function constructCanonicalUrl(path: string): string {
  if (!path) return `${getSiteBaseUrl()}/`;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteBaseUrl()}${cleanPath}`;
}

export interface ConstructPageMetadataOptions {
  title?: string;
  description?: string;
  path?: string;
  image?: string | null;
  type?: "website" | "article" | "profile";
  noIndex?: boolean;
  publishedTime?: string | Date;
  modifiedTime?: string | Date;
  authors?: string[];
  tags?: string[];
}

/**
 * Generates standardized Next.js Metadata with canonical links (<link rel="canonical">),
 * OpenGraph, Twitter cards, and indexing directives.
 */
export function constructPageMetadata(options: ConstructPageMetadataOptions): Metadata {
  const {
    title,
    description = "Saints Gaming - Dedicated Game Servers, Custom Modpacks, Community Forums, Live Streams, and Embedded MMO Experience.",
    path = "/",
    image,
    type = "website",
    noIndex = false,
    publishedTime,
    modifiedTime,
    authors,
    tags,
  } = options;

  const fullTitle = title ? (title.includes("Saints Gaming") ? title : `${title} | Saints Gaming`) : "Saints Gaming";
  const canonicalUrl = constructCanonicalUrl(path);
  const siteUrl = getSiteBaseUrl();

  const formattedImage = image
    ? image.startsWith("http")
      ? image
      : `${siteUrl}${image.startsWith("/") ? image : `/${image}`}`
    : `${siteUrl}/og-image.jpg`;

  const meta: Metadata = {
    title: fullTitle,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName: "Saints Gaming",
      locale: "en_US",
      type: type === "article" ? "article" : "website",
      images: [
        {
          url: formattedImage,
          width: 1200,
          height: 630,
          alt: title || "Saints Gaming",
        },
      ],
      ...(type === "article" && {
        publishedTime: publishedTime ? new Date(publishedTime).toISOString() : undefined,
        modifiedTime: modifiedTime ? new Date(modifiedTime).toISOString() : undefined,
        authors: authors && authors.length > 0 ? authors : undefined,
        tags: tags && tags.length > 0 ? tags : undefined,
      }),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: fullTitle,
      description,
      images: [formattedImage],
    },
  };

  if (noIndex) {
    meta.robots = {
      index: false,
      follow: true,
    };
  }

  return meta;
}

/** Specialized helper for News Articles */
export function getNewsArticleMetadata(article: {
  title: string;
  excerpt?: string | null;
  body: string;
  slug: string;
  coverImage?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  author?: { name?: string | null; username?: string | null } | null;
}): Metadata {
  const description =
    article.excerpt?.trim() ||
    article.body.replace(/[#*`_~>[\]]/g, "").substring(0, 160).trim() + "...";
  
  const authorName = article.author?.username || article.author?.name || "Saints Gaming Staff";

  return constructPageMetadata({
    title: article.title,
    description,
    path: `/news/${article.slug}`,
    image: article.coverImage,
    type: "article",
    publishedTime: article.createdAt,
    modifiedTime: article.updatedAt,
    authors: [authorName],
  });
}

/** Specialized helper for Forum Categories / Subcategories */
export function getForumCategoryMetadata(subcategory: {
  name: string;
  description?: string | null;
  slug: string;
}): Metadata {
  const description = subcategory.description?.trim() || `Browse discussions, guides, and community threads in ${subcategory.name}.`;
  return constructPageMetadata({
    title: `${subcategory.name} | Forums`,
    description,
    path: `/forum/${subcategory.slug}`,
    type: "website",
  });
}

/** Specialized helper for Forum Threads */
export function getForumThreadMetadata(thread: {
  title: string;
  body: string;
  slug: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  author?: { name?: string | null; username?: string | null } | null;
  tags?: string[];
}): Metadata {
  const description = thread.body.replace(/[#*`_~>[\]]/g, "").substring(0, 160).trim() + "...";
  const authorName = thread.author?.username || thread.author?.name || "Community Member";

  return constructPageMetadata({
    title: `${thread.title} | Forums`,
    description,
    path: `/forum/t/${thread.slug}`,
    type: "article",
    publishedTime: thread.createdAt,
    modifiedTime: thread.updatedAt,
    authors: [authorName],
    tags: thread.tags,
  });
}

/** Specialized helper for Public User Profiles */
export function getUserProfileMetadata(user: {
  username?: string | null;
  name?: string | null;
  bio?: string | null;
  avatar?: string | null;
}): Metadata {
  const displayName = user.username || user.name || "Member";
  const description = user.bio?.trim() || `View ${displayName}'s gamer profile, achievements, badges, and activity on Saints Gaming.`;

  return constructPageMetadata({
    title: `${displayName}'s Profile`,
    description,
    path: `/user/${encodeURIComponent(displayName)}`,
    image: user.avatar,
    type: "profile",
  });
}

/** Specialized helper for Wiki Codex Pages */
export function getWikiArticleMetadata(article: {
  title: string;
  summary?: string | null;
  content?: string | null;
  slug: string;
}): Metadata {
  const description =
    article.summary?.trim() ||
    article.content?.replace(/[#*`_~>[\]]/g, "").substring(0, 160).trim() ||
    `Learn about ${article.title} in the Saints Gaming Codex.`;

  return constructPageMetadata({
    title: `${article.title} | Codex`,
    description,
    path: `/wiki/${article.slug.replace(/^\/+/, "")}`,
    type: "article",
  });
}

