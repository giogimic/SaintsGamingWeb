import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Eye, Edit } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { DeleteArticleButton } from "@/components/admin/delete-article-button";

export default async function AdminNewsPage() {
  const session = await auth();

  // Protect route
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true, isWriter: true }
  });

  if (!user || (user.permissionLevel < PERMISSION_LEVELS.ADMIN && !user.isWriter)) {
    return <div className="p-8 text-center text-red-500">Access Denied</div>;
  }

  const articles = await prisma.newsArticle.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: { select: { username: true } } }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">News Manager</h1>
          <p className="text-muted-foreground mt-1">
            Create, edit, and publish community announcements.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/news/new">
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
                  <th className="h-10 px-4 font-medium">Author</th>
                  <th className="h-10 px-4 font-medium">Date</th>
                  <th className="h-10 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No news articles found. Create your first one!
                    </td>
                  </tr>
                ) : (
                  articles.map((article) => (
                    <tr key={article.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium">
                        <div className="line-clamp-1">{article.title}</div>
                      </td>
                      <td className="p-4">
                        {article.isPublished ? (
                          <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">Published</Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-500 border-amber-500/20">Draft</Badge>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground">{article.author.username}</td>
                      <td className="p-4 text-muted-foreground">
                        {format(new Date(article.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/news/${article.slug}`} target="_blank">
                            <Eye className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/news/edit/${article.id}`}>
                            <Edit className="h-4 w-4 text-muted-foreground hover:text-blue-400" />
                          </Link>
                        </Button>
                        <DeleteArticleButton id={article.id} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
