import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Eye, Edit } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { DeleteArticleButton } from "@/components/admin/delete-article-button";

export const metadata = { title: "Writer - My Articles" };

export default async function WriterNewsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  // Fetch ONLY articles authored by this user
  const articles = await prisma.newsArticle.findMany({
    where: { authorId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Articles</h1>
          <p className="text-muted-foreground mt-1">
            Manage your drafts, schedule releases, or publish immediately.
          </p>
        </div>
        <Button asChild>
          <Link href="/writer/news/new">
            <Plus className="mr-2 h-4 w-4" /> Create Article
          </Link>
        </Button>
      </div>

      <Card className="bg-card/40 border-border/50">
        <CardContent className="p-0">
          <div className="rounded-md border border-border/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border/50 text-left">
                <tr>
                  <th className="h-10 px-4 font-medium">Title</th>
                  <th className="h-10 px-4 font-medium">Status</th>
                  <th className="h-10 px-4 font-medium">Scheduled / Published Date</th>
                  <th className="h-10 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      You haven&apos;t written any articles yet. Create your first one!
                    </td>
                  </tr>
                ) : (
                  articles.map((article) => {
                    const isScheduled = article.isPublished && article.publishedAt && new Date(article.publishedAt) > new Date();

                    return (
                      <tr key={article.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-medium">
                          <div className="line-clamp-1">{article.title}</div>
                        </td>
                        <td className="p-4">
                          {isScheduled ? (
                            <Badge variant="outline" className="text-emerald-400 border-emerald-400/20">Scheduled</Badge>
                          ) : article.isPublished ? (
                            <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">Published</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-500 border-amber-500/20">Draft</Badge>
                          )}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {article.publishedAt ? format(new Date(article.publishedAt), "MMM d, yyyy h:mm a") : "—"}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/news/${article.slug}`} target="_blank">
                              <Eye className="h-4 w-4 text-muted-foreground hover:text-primary" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/writer/news/edit/${article.id}`}>
                              <Edit className="h-4 w-4 text-muted-foreground hover:text-blue-400" />
                            </Link>
                          </Button>
                          {/* We can re-use DeleteArticleButton since we'll update the server action to allow WRITER if they own it */}
                          <DeleteArticleButton id={article.id} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
