import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { User as UserIcon, Heart, MessageSquare, Repeat2, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createSocialPost, toggleReaction, deleteSocialPost } from "./actions";

export default async function SocialDashboard(props: { searchParams: Promise<{ filter?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const searchParams = await props.searchParams;
  const filter = searchParams.filter || "global";

  // Fetch friends to know whose posts to show if filter is 'friends'
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [
        { userId: session.user.id },
        { friendId: session.user.id }
      ]
    }
  });

  const friendIds = friendships.map(f => f.userId === session.user.id ? f.friendId : f.userId);

  // Fetch posts
  const posts = await prisma.socialPost.findMany({
    where: filter === "friends" 
      ? { authorId: { in: [session.user.id, ...friendIds] } } 
      : { 
          OR: [
            { visibility: "PUBLIC" },
            { visibility: "FRIENDS", authorId: { in: [session.user.id, ...friendIds] } }
          ]
        },
    include: {
      author: { select: { id: true, username: true, image: true } },
      reactions: true,
      hashtags: { include: { hashtag: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  // Fetch trending hashtags
  const topHashtags = await prisma.socialHashtag.findMany({
    orderBy: { posts: { _count: 'desc' } },
    take: 10,
    include: { _count: { select: { posts: true } } }
  });

  return (
    <div className="w-full px-4 sm:px-6 lg:px-12 py-8">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
        
        {/* Main Feed Column */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-extrabold tracking-tight sg-text-gradient drop-shadow-sm">The Feed</h1>
            <div className="flex bg-muted p-1 rounded-md">
              <Link href="/ucp/social?filter=global" className={`px-4 py-1 text-sm font-medium rounded-sm ${filter === 'global' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Global</Link>
              <Link href="/ucp/social?filter=friends" className={`px-4 py-1 text-sm font-medium rounded-sm ${filter === 'friends' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Friends</Link>
            </div>
          </div>

          {/* Composer */}
          <Card className="bg-card/20 backdrop-blur-md border-primary/10 shadow-lg">
            <CardContent className="pt-6">
              <form action={createSocialPost} className="space-y-4">
                <Textarea 
                  name="content" 
                  placeholder="What's going on in the city? Use #hashtags!" 
                  className="resize-none border-0 focus-visible:ring-0 px-0 shadow-none bg-transparent"
                  rows={3}
                />
                
                {/* Media Upload hidden input - assuming we integrate lib/upload client-side in the future. For now, simple text. */}
                <input type="hidden" name="mediaUrl" value="" id="mediaUrlHidden" />
                
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <div className="flex gap-2">
                    <select name="visibility" className="text-xs bg-muted text-muted-foreground rounded px-2 py-1 outline-none">
                      <option value="PUBLIC">🌍 Public</option>
                      <option value="FRIENDS">👥 Friends Only</option>
                    </select>
                  </div>
                  <Button type="submit" size="sm">Post</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Feed */}
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                No posts found. Be the first to say something!
              </div>
            ) : (
              posts.map(post => {
                const isLiked = post.reactions.some(r => r.userId === session.user?.id);
                return (
                  <Card key={post.id} className="overflow-hidden hover:bg-card/50 hover:border-primary/30 transition-all shadow-md">
                    <CardContent className="p-4 sm:p-6 lg:p-8">
                      <div className="flex gap-4">
                        <Link href={`/user/${post.author.username}`} className="shrink-0">
                          <div className="w-12 h-12 rounded-full bg-muted overflow-hidden relative border border-border">
                            {post.author.image ? (
                              <Image src={post.author.image} alt={post.author.username} fill className="object-cover" />
                            ) : (
                              <UserIcon className="w-6 h-6 m-auto mt-3 text-muted-foreground" />
                            )}
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Link href={`/user/${post.author.username}`} className="font-bold hover:underline truncate">
                              {post.author.username}
                            </Link>
                            <span className="text-xs text-muted-foreground shrink-0">
                              · {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <p className="text-sm md:text-base whitespace-pre-wrap break-words">
                            {post.body.split(/(#[a-zA-Z0-9_]+)/g).map((part, i) => {
                              if (part.startsWith('#')) {
                                return <span key={i} className="text-primary font-medium">{part}</span>;
                              }
                              return part;
                            })}
                          </p>

                          {post.mediaUrl && (
                            <div className="mt-3 rounded-lg overflow-hidden border border-border max-h-96 relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={post.mediaUrl} alt="Post media" className="object-cover w-full max-h-96" />
                            </div>
                          )}

                          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border/50">
                            <form action={toggleReaction.bind(null, post.id)}>
                              <button type="submit" className={`flex items-center gap-1.5 text-sm transition-colors ${isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}>
                                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                                <span>{post.reactions.length}</span>
                              </button>
                            </form>
                            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                              <MessageSquare className="w-4 h-4" />
                              <span>Reply</span>
                            </button>
                            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-green-500 transition-colors">
                              <Repeat2 className="w-4 h-4" />
                              <span>Share</span>
                            </button>
                            {post.authorId === session.user.id && (
                              <form action={deleteSocialPost.bind(null, post.id)}>
                                <button type="submit" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors ml-auto">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </form>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-96 xl:w-[400px] shrink-0 space-y-6 lg:sticky lg:top-32 h-fit">
          <Card className="bg-muted/10 backdrop-blur-lg">
            <CardContent className="p-6">
              <h2 className="font-bold text-lg mb-4">Trending in the City</h2>
              <div className="space-y-4">
                {topHashtags.map((tag, i) => (
                  <div key={tag.id} className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">{i + 1} · Trending</p>
                      <Link href={`/ucp/social?filter=global&tag=${tag.name}`} className="font-bold text-sm hover:underline">
                        #{tag.name}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">{tag._count.posts} posts</p>
                    </div>
                  </div>
                ))}
                {topHashtags.length === 0 && (
                  <p className="text-sm text-muted-foreground">No trends yet.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <h2 className="font-bold text-lg mb-2">Social Hub</h2>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                This is your private UCP feed. Share clips, find groups, and stay updated with the community without leaving the dashboard.
              </p>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
