import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import { redirect } from "next/navigation";
import { 
  MessagesSquare, Lock, ShieldCheck, Users, 
  Key, MessageCircle, HeartHandshake
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/web/components/ui/card";
import { Badge } from "@/web/components/ui/badge";

export const metadata = {
  title: "Messenger & Social Graph | Saints Gaming Admin",
};

export default async function AdminMessengerPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const viewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true, isWriter: true },
  });

  if (!viewer || viewer.permissionLevel < PERMISSION_LEVELS.ADMIN) {
    redirect("/not-found");
  }

  // Fetch Messenger and social graph statistics
  const [
    dmCount,
    groupChatCount,
    friendshipCount,
    acceptedFriendships,
    publicKeyCount,
    groupChats,
  ] = await Promise.all([
    prisma.directMessage.count(),
    prisma.groupChat.count(),
    prisma.friendship.count(),
    prisma.friendship.count({ where: { status: "ACCEPTED" } }),
    prisma.userPublicKey.count(),
    prisma.groupChat.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        members: { include: { user: { select: { username: true } } } },
        _count: { select: { messages: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Community &amp; Content</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">Social Graph</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <MessagesSquare className="h-8 w-8 text-primary" />
            Messenger &amp; Social Graph Oversight
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor platform friendship connections, active group chats, and E2EE (End-to-End Encryption) key status.
          </p>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Direct Messages</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-primary">{dmCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Group Chats</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-amber-400">{groupChatCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Friendships</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-emerald-400">{acceptedFriendships} / {friendshipCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">E2EE Keypairs</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-cyan-400">{publicKeyCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Security Info Card */}
      <Card className="border-emerald-500/20 bg-emerald-500/5 sg-glass">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
            <Lock className="h-5 w-5" />
          </div>
          <div className="space-y-0.5 text-xs">
            <h3 className="font-bold text-sm text-foreground">Zero-Knowledge E2EE Architecture</h3>
            <p className="text-muted-foreground">
              Direct Messages on Saints Gaming are encrypted client-side using WebCrypto SPKI/ECDH public key encryption. The database only stores ciphertext and initialization vectors (IVs). Staff members cannot read player DMs in plaintext, preserving user privacy.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Group Chats Table */}
      <Card className="bg-card/40 border-border/50 sg-glass">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Active Group Channels ({groupChats.length})
          </CardTitle>
          <CardDescription>Community group chat rooms and participant member rosters.</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {groupChats.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">No group chats created yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupChats.map((gc) => (
                <div key={gc.id} className="p-4 rounded-xl border border-border/40 bg-background/50 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-foreground">{gc.name || "Untitled Group"}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {gc.members.length} Members
                    </Badge>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground">
                    {gc._count.messages} Total Messages
                  </div>
                  <div className="pt-2 border-t border-border/30">
                    <span className="text-[10px] uppercase font-mono text-muted-foreground block mb-1">Members:</span>
                    <div className="flex gap-1 flex-wrap">
                      {gc.members.map((m) => (
                        <Badge key={m.id} variant="secondary" className="text-[10px]">
                          {m.user.username} {m.role === "ADMIN" && "★"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
