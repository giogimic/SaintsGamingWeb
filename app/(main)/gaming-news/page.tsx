import { prisma } from "@/lib/prisma";
import Parser from "rss-parser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Newspaper, ExternalLink } from "lucide-react";
import Image from "next/image";

export const metadata = { title: "Gaming News" };
export const revalidate = 3600; // Revalidate every hour

const parser = new Parser({
  customFields: {
    item: ['media:content', 'enclosure', 'category']
  }
});

type FormattedArticle = {
  id: string;
  title: string;
  link: string;
  pubDate: Date;
  source: string;
  category: string;
  snippet: string;
  imageUrl?: string;
};

export default async function GamingNewsPage() {
  const activeFeeds = await prisma.rssFeed.findMany({
    where: { isActive: true }
  });

  let allArticles: FormattedArticle[] = [];

  // Fetch all feeds in parallel
  const feedPromises = activeFeeds.map(async (feed) => {
    try {
      const parsed = await parser.parseURL(feed.url);
      
      const articles = parsed.items.map(item => {
        // Simple snippet extraction
        let snippet = (item.contentSnippet || item.content || "").substring(0, 150);
        if (snippet.length === 150) snippet += "...";

        // Extract image
        let imageUrl = undefined;
        if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
          imageUrl = item.enclosure.url;
        } else if (item['media:content']?.$?.url) {
          imageUrl = item['media:content'].$.url;
        } else if (item.content) {
          // fallback to finding the first img tag in the content
          const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/i);
          if (imgMatch && imgMatch[1]) {
            imageUrl = imgMatch[1];
          }
        }

        return {
          id: item.guid || item.link || Math.random().toString(),
          title: item.title || "Untitled",
          link: item.link || "#",
          pubDate: item.isoDate ? new Date(item.isoDate) : new Date(),
          source: feed.title,
          category: feed.category,
          snippet,
          imageUrl
        };
      });

      allArticles.push(...articles);
    } catch (error) {
      console.error(`Failed to parse feed ${feed.title}:`, error);
    }
  });

  await Promise.all(feedPromises);

  // Sort by date descending
  allArticles.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
  
  // Take top 50 recent
  allArticles = allArticles.slice(0, 50);

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl space-y-8">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
          <Newspaper className="h-8 w-8 text-primary" />
          Industry News
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          The latest headlines aggregated from popular gaming outlets.
        </p>
      </div>

      {allArticles.length === 0 ? (
        <div className="text-center py-16 bg-card/30 border border-border/50 rounded-2xl">
          <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold">No news available</h3>
          <p className="text-muted-foreground">Admins have not configured any active RSS feeds yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {allArticles.map((article) => (
            <a key={article.id} href={article.link} target="_blank" rel="noopener noreferrer" className="block group">
              <Card className="h-full bg-card/50 hover:bg-muted/30 transition-all border-border/50 group-hover:border-primary/50 overflow-hidden flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {article.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-semibold">
                      {article.source}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {article.pubDate.toLocaleDateString()}
                    </span>
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors leading-tight line-clamp-2">
                    {article.title}
                  </CardTitle>
                </CardHeader>
                {article.imageUrl && (
                  <div className="w-full h-48 bg-muted relative overflow-hidden shrink-0">
                    <Image 
                      src={article.imageUrl} 
                      alt="" 
                      fill 
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  </div>
                )}
                <CardContent className="flex-1 flex flex-col pt-4">
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                    {article.snippet}
                  </p>
                  <div className="flex items-center text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity mt-auto">
                    Read full story <ExternalLink className="ml-1 h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
