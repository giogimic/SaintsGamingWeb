import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";
import WikiArticleView from "@/web/components/wiki/WikiArticleView";
import WikiSidebar from "@/web/components/wiki/WikiSidebar";
import WikiTOC from "@/web/components/wiki/WikiTOC";
import WikiBreadcrumbs from "@/web/components/wiki/WikiBreadcrumbs";
import {
  getWikiArticle,
  getAllWikiArticles,
  getWikiCategory,
} from "@/shared/wiki/wikiRegistry";
import type { Metadata } from "next";

interface WikiArticlePageProps {
  params: Promise<{ slug: string[] }>;
}

/** Resolve the markdown file content from the docs/wiki/ directory */
function getMarkdownContent(filePath: string): string | null {
  const fullPath = path.join(process.cwd(), "docs", "wiki", filePath);
  try {
    return fs.readFileSync(fullPath, "utf-8");
  } catch {
    return null;
  }
}

/** Generate static params for all known wiki articles */
export async function generateStaticParams() {
  const articles = getAllWikiArticles();
  return articles.map((article) => ({
    slug: article.slug.split("/"),
  }));
}

/** Generate dynamic metadata based on the article */
export async function generateMetadata({
  params,
}: WikiArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const slugPath = slug.join("/");
  const article = getWikiArticle(slugPath);

  if (!article) {
    return {
      title: "Not Found | Saints Gaming Wiki",
    };
  }

  const category = getWikiCategory(article.categoryId);
  return {
    title: `${article.title} | ${category?.title ?? "Wiki"} | Saints Gaming`,
    description: article.summary,
  };
}

export default async function WikiArticlePage({ params }: WikiArticlePageProps) {
  const { slug } = await params;
  const slugPath = slug.join("/");

  // If slug is just a category (1 part), redirect to first article
  if (slug.length === 1) {
    const category = getWikiCategory(slug[0]);
    if (category && category.articles.length > 0) {
      const firstArticle = category.articles[0];
      const { redirect } = await import("next/navigation");
      redirect(`/wiki/${firstArticle.slug}`);
    }
    notFound();
  }

  const article = getWikiArticle(slugPath);
  if (!article) {
    notFound();
  }

  const content = getMarkdownContent(article.filePath);
  if (!content) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8 lg:py-12">
      <WikiBreadcrumbs slug={slugPath} />

      <div className="flex gap-8 mt-4">
        {/* Left Sidebar — WikiSidebar handles its own lg:hidden / lg:block internally */}
        <WikiSidebar currentSlug={slugPath} />

        {/* Main article content */}
        <article className="flex-1 min-w-0">
          <WikiArticleView content={content} article={article} />
        </article>

        {/* Right TOC — WikiTOC handles its own xl:hidden / xl:block internally */}
        <WikiTOC content={content} />
      </div>
    </div>
  );
}
