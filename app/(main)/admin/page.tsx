import { prisma } from "@/web/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, FileText, Gamepad2, Tv, MessageSquare, LayoutDashboard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { auth } from "@/auth";
import { PERMISSION_LEVELS, hasPermission } from "@/web/lib/permissions";

export const metadata = {
  title: "Admin Dashboard",
};

export default async function AdminDashboardPage() {
  // The layout admits Moderator+ *or* isWriter, so a level-20 writer lands here.
  // Gate each card the same way the sidebar does instead of advertising modules
  // the visitor cannot open.
  const session = await auth();
  if (!session?.user?.id) redirect("/not-found");
  const viewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true, isWriter: true },
  });
  if (!viewer) redirect("/not-found");
  const level = viewer.permissionLevel;

  // Fetch some quick stats
  const [
    userCount,
    newsCount,
    modpackCount,
    streamCount,
    categoryCount,
    threadCount,
    characterCount,
    propertyCount,
    vehicleCount,
    gameCharacterCount,
    gameQuestCount,
    gameAssetCount,
    worldMapCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.newsArticle.count(),
    prisma.modpack.count(),
    prisma.streamProfile.count(),
    prisma.forumCategory.count(),
    prisma.thread.count(),
    prisma.character.count(),
    prisma.property.count(),
    prisma.vehicle.count(),
    prisma.gameCharacter.count(),
    prisma.gameQuest.count(),
    prisma.gameAsset.count(),
    prisma.worldMap.count(),
  ]);

  const quickLinks = [
    {
      title: "News Management",
      description: "Draft and publish front-page announcements.",
      href: "/admin/news",
      icon: <FileText className="h-6 w-6 text-primary" />,
      stat: `${newsCount} Articles`,
      isVisible: hasPermission(level, PERMISSION_LEVELS.ADMIN) || viewer.isWriter,
    },
    {
      title: "Modpacks & Servers",
      description: "Manage game servers and modpack listings.",
      href: "/admin/modpacks",
      icon: <Gamepad2 className="h-6 w-6 text-primary" />,
      stat: `${modpackCount} Modpacks`,
      isVisible: hasPermission(level, PERMISSION_LEVELS.ADMIN),
    },
    {
      title: "Stream Approvals",
      description: "Review community stream submissions.",
      href: "/admin/streams",
      icon: <Tv className="h-6 w-6 text-primary" />,
      stat: `${streamCount} Profiles`,
      isVisible: hasPermission(level, PERMISSION_LEVELS.MODERATOR),
    },
    {
      title: "Forum Categories",
      description: "Manage forum boards and structure.",
      href: "/admin/forum",
      icon: <MessageSquare className="h-6 w-6 text-primary" />,
      stat: `${categoryCount} Categories`,
      isVisible: hasPermission(level, PERMISSION_LEVELS.HEAD_MODERATOR),
    },
    {
      title: "Game Dev Suite",
      description: "Manage MMO Quests, Assets, Maps, and Sandboxes.",
      href: "/admin/game-dev/quests",
      icon: <Gamepad2 className="h-6 w-6 text-emerald-400" />,
      stat: `${gameQuestCount} Quests / ${gameAssetCount} Assets`,
      isVisible: hasPermission(level, PERMISSION_LEVELS.DEVELOPER),
    },
    {
      title: "User Management",
      description: "View community members and ban/promote users.",
      href: "/admin/users",
      icon: <Users className="h-6 w-6 text-muted-foreground" />,
      stat: `${userCount} Users`,
      isVisible: hasPermission(level, PERMISSION_LEVELS.ADMIN),
    },
  ].filter((link) => link.isVisible);

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex items-center gap-3">
        <LayoutDashboard className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview and quick access to management modules.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href} className="group block h-full">
            <Card className="h-full bg-card/40 hover:bg-card/60 transition-colors border-border/50 sg-glass">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                  {link.title}
                </CardTitle>
                {link.icon}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {link.description}
                </p>
                <div className="text-sm font-semibold bg-muted/50 inline-flex px-2 py-1 rounded-md">
                  {link.stat}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {quickLinks.length === 0 && (
          <Card className="h-full bg-card/40 border-border/50 sg-glass md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-bold">No modules available</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your account does not have access to any management modules. Use the
                sidebar for the areas you can reach.
              </p>
            </CardContent>
          </Card>
        )}

        {hasPermission(level, PERMISSION_LEVELS.MODERATOR) && (
        <Card className="h-full bg-primary/5 border-primary/20 sg-glass">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-primary">System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Database</span>
              <span className="font-semibold text-green-500">Connected (SQLite)</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Total Threads</span>
              <span className="font-semibold">{threadCount}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">MMO Characters</span>
              <span className="font-semibold text-emerald-400">{gameCharacterCount}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Custom World Maps</span>
              <span className="font-semibold text-purple-400">{worldMapCount}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">FiveM Characters</span>
              <span className="font-semibold">{characterCount}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Properties & Vehicles</span>
              <span className="font-semibold">{propertyCount + vehicleCount}</span>
            </div>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}
