import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Rss, Trash2, Power } from "lucide-react";
import { addRssFeed, deleteRssFeed, toggleRssFeed } from "./actions";

export const metadata = { title: "Admin - RSS Feeds" };

export default async function AdminRssPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true }
  });

  if (!user || user.permissionLevel < PERMISSION_LEVELS.ADMIN) {
    return <div className="p-8 text-center text-red-500 font-bold">Access Denied</div>;
  }

  const feeds = await prisma.rssFeed.findMany({
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex items-center gap-3">
        <Rss className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">RSS Feed Manager</h1>
          <p className="text-muted-foreground mt-1">
            Add XML/RSS feeds from gaming news sites to aggregate them on the public Gaming News page.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Feed Form */}
        <div className="lg:col-span-1">
          <Card className="bg-card/40 border-border/50">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Add New Feed</h2>
              <form action={addRssFeed} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Site Title</Label>
                  <Input id="title" name="title" required placeholder="e.g. IGN News" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">RSS Feed URL</Label>
                  <Input id="url" name="url" type="url" required placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select 
                    id="category" 
                    name="category" 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="General Gaming">General Gaming</option>
                    <option value="PC Gaming">PC Gaming</option>
                    <option value="Console">Console (Xbox/PS)</option>
                    <option value="Roleplay">Roleplay (FiveM/RedM)</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox id="isActive" name="isActive" defaultChecked />
                  <Label htmlFor="isActive">Active (Display publicly)</Label>
                </div>
                <Button type="submit" className="w-full">Add Feed</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Existing Feeds List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold">Configured Feeds</h2>
          {feeds.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground border border-border/50 rounded-lg bg-card/20">
              No RSS feeds configured yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {feeds.map(feed => (
                <div key={feed.id} className={`p-4 border border-border/50 rounded-lg flex items-center justify-between ${feed.isActive ? 'bg-card' : 'bg-muted/30 opacity-60'}`}>
                  <div>
                    <h3 className="font-bold flex items-center gap-2">
                      {feed.title}
                      {!feed.isActive && <span className="text-xs text-red-400 border border-red-900/50 px-1.5 rounded">Disabled</span>}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">{feed.url}</p>
                    <span className="inline-block mt-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {feed.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={async () => { "use server"; await toggleRssFeed(feed.id, feed.isActive); }}>
                      <Button variant="outline" size="icon" type="submit" title={feed.isActive ? "Disable" : "Enable"}>
                        <Power className={`h-4 w-4 ${feed.isActive ? 'text-green-500' : 'text-muted-foreground'}`} />
                      </Button>
                    </form>
                    <form action={async () => { "use server"; await deleteRssFeed(feed.id); }}>
                      <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10" type="submit">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
