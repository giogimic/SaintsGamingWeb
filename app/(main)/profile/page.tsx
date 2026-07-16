import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { getRoleName, getRoleColor, PERMISSION_LEVELS } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { User, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { user } = session;
  const roleLevel = user.permissionLevel as number;
  const roleName = getRoleName(roleLevel);
  const roleColor = getRoleColor(roleLevel);

  const [recentThreads, recentReplies] = await Promise.all([
    prisma.thread.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.reply.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { thread: true },
    })
  ]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-primary/10">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Your Profile</h1>
          <p className="text-muted-foreground">Manage your account settings</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="text-center">
              <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center text-3xl font-bold mb-4 overflow-hidden relative">
                {user.image ? (
                  <Image 
                    src={user.image} 
                    alt={user.name || "Avatar"} 
                    fill
                    sizes="96px"
                    className="object-cover" 
                  />
                ) : (
                  user.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()
                )}
              </div>
              <CardTitle className="text-xl">
                {user.username || user.name}
              </CardTitle>
              <CardDescription>{user.email}</CardDescription>
              <div className="mt-4">
                <Badge variant="outline" className={`${roleColor} bg-background`}>
                  {roleName}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {roleLevel >= PERMISSION_LEVELS.MODERATOR && (
                <Link href="/admin" className={buttonVariants({ variant: "outline", className: "w-full justify-start" })}>
                  <Settings className="mr-2 h-4 w-4" />
                  Admin Dashboard
                </Link>
              )}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <Button variant="destructive" className="w-full justify-start" type="submit">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
              <CardDescription>Your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Username</h3>
                  <p className="mt-1">{user.username || "Not set"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                  <p className="mt-1">{user.email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">User ID</h3>
                  <p className="mt-1 text-xs font-mono bg-muted p-1 rounded inline-block">{user.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50 mt-6">
            <CardHeader>
              <CardTitle>Recent Forum Activity</CardTitle>
              <CardDescription>Your latest threads and replies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold mb-3 border-b border-border/50 pb-2">Latest Threads</h4>
                {recentThreads.length > 0 ? (
                  <ul className="space-y-3">
                    {recentThreads.map(thread => (
                      <li key={thread.id}>
                        <Link href={`/forum/thread/${thread.slug}`} className="text-primary hover:underline font-medium line-clamp-1">
                          {thread.title}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(thread.createdAt).toLocaleDateString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No threads created yet.</p>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3 border-b border-border/50 pb-2">Latest Replies</h4>
                {recentReplies.length > 0 ? (
                  <ul className="space-y-3">
                    {recentReplies.map(reply => (
                      <li key={reply.id}>
                        <Link href={`/forum/thread/${reply.thread.slug}#reply-${reply.id}`} className="text-sm hover:text-primary transition-colors line-clamp-2">
                          &quot;{reply.body.substring(0, 80)}{reply.body.length > 80 ? '...' : ''}&quot;
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          In: <span className="font-medium text-foreground/80">{reply.thread.title}</span> • {new Date(reply.createdAt).toLocaleDateString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No replies posted yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
