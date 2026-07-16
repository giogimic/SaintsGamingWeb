import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { Calendar, User, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "News & Announcements | Saints Gaming",
  description: "Stay up to date with the latest Saints Gaming community news, updates, and events.",
  openGraph: {
    title: "News & Announcements | Saints Gaming",
    description: "Stay up to date with the latest Saints Gaming community news, updates, and events.",
    type: "website",
    url: "https://saintsgaming.net/news",
    siteName: "Saints Gaming",
  },
  twitter: {
    card: "summary_large_image",
    title: "News & Announcements | Saints Gaming",
    description: "Stay up to date with the latest Saints Gaming community news, updates, and events.",
  },
};

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10) || 1;
  const limit = 9;
  const skip = (page - 1) * limit;

  const whereClause = { 
    isPublished: true,
    publishedAt: { lte: new Date() }
  };

  const [articles, totalCount] = await Promise.all([
    prisma.newsArticle.findMany({
      where: whereClause,
      orderBy: { publishedAt: "desc" },
      include: { author: { select: { username: true } } },
      take: limit,
      skip: skip,
    }),
    prisma.newsArticle.count({ where: whereClause })
  ]);
  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="text-center mb-16 space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight sg-text-gradient">
          Community News
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Stay up to date with the latest announcements, events, and updates from the Saints Gaming network.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {articles.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card/30 rounded-xl border border-border/50">
            No news articles published yet. Check back soon!
          </div>
        ) : (
          articles.map((article) => (
            <Link key={article.id} href={`/news/${article.slug}`} className="group h-full">
              <Card className="h-full bg-card/40 hover:bg-card/60 transition-colors border-border/50 overflow-hidden flex flex-col sg-glass sg-3d-card">
                {article.coverImage ? (
                  <div className="relative h-48 w-full overflow-hidden">
                    {article.coverImage.trim().startsWith('<svg') ? (
                      <div 
                        className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-cover transition-transform duration-500 group-hover:scale-105"
                        dangerouslySetInnerHTML={{ __html: sanitizeSvg(article.coverImage) }} 
                      />
                    ) : (
                      <Image
                        src={article.coverImage}
                        alt={article.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                  </div>
                ) : (
                  <div className="h-48 w-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                    <span className="text-4xl font-bold opacity-20">SG</span>
                  </div>
                )}
                
                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {article.publishedAt ? format(new Date(article.publishedAt), "MMM d, yyyy") : "Draft"}
                    </div>
                  </div>
                  
                  <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </h2>
                  
                  <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-1">
                    {article.excerpt || article.body.substring(0, 150) + "..."}
                  </p>
                  
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                    <div className="flex items-center gap-1.5 text-sm text-foreground">
                      <User className="h-4 w-4 text-primary" />
                      <span className="font-medium">{article.author.username}</span>
                    </div>
                    <span className="text-primary text-sm font-medium flex items-center group-hover:translate-x-1 transition-transform">
                      Read more <ArrowRight className="h-4 w-4 ml-1" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-12 gap-2">
          {page > 1 && (
            <Link href={`/news?page=${page - 1}`} className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80">
              Previous
            </Link>
          )}
          <span className="px-4 py-2 flex items-center">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/news?page=${page + 1}`} className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// Simple XSS strip for SVGs
function sanitizeSvg(svg: string) {
  if (!svg) return "";
  // Strip <script> tags
  let clean = svg.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  // Strip on* event handlers (e.g., onload=, onerror=, onmouseover=)
  clean = clean.replace(/\bon\w+\s*=\s*(['"])(?:(?!\1).)*\1/gi, "");
  clean = clean.replace(/\bon\w+\s*=\s*[^>\s]+/gi, "");
  // Strip javascript: hrefs
  clean = clean.replace(/href\s*=\s*(['"])javascript:.*?\1/gi, "");
  return clean;
}
