import type { Metadata } from "next";
import Link from "next/link";
import {
  Newspaper,
  Package,
  MessageSquare,
  Monitor,
  Users,
  Gamepad2,
  ArrowRight,
  Swords,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/web/components/ui/card";
import { Badge } from "@/web/components/ui/badge";
import { buttonVariants } from "@/web/components/ui/button";
import { Separator } from "@/web/components/ui/separator";
import { prisma } from "@/web/lib/prisma";
import {
  DEFAULT_REALM_NAME,
  DEFAULT_REALM_DESCRIPTION,
  SETUP_SETTING_KEYS,
} from "@/shared/game/setup/setupDetection";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Saints Gaming - Game Servers, Mod Packs, Community its Time To Play!",
};

export default async function HomePage() {
  let realmName = DEFAULT_REALM_NAME;
  let realmDescription = DEFAULT_REALM_DESCRIPTION;

  try {
    const [nameSetting, descSetting] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: SETUP_SETTING_KEYS.REALM_NAME } }),
      prisma.siteSetting.findUnique({ where: { key: SETUP_SETTING_KEYS.REALM_DESCRIPTION } }),
    ]);
    if (nameSetting?.value?.trim()) realmName = nameSetting.value.trim();
    if (descSetting?.value?.trim()) realmDescription = descSetting.value.trim();
  } catch (error) {
    console.error("[HomePage] Failed to fetch realm settings:", error);
  }

  const features = [
    {
      icon: Gamepad2,
      title: realmName,
      description: realmDescription,
      href: "/lobby",
      color: "text-amber-400",
      badge: "Live Game",
      highlight: true,
    },
    {
      icon: Newspaper,
      title: "News & Opinions",
      description: "Gaming takes, updates, and community news from our writers.",
      href: "/news",
      color: "text-blue-400",
    },
    {
      icon: Package,
      title: "Modpacks",
      description:
        "Browse our Minecraft modpacks — active and archived. Easy to explore.",
      href: "/modpacks",
      color: "text-green-400",
    },
    {
      icon: MessageSquare,
      title: "Forum",
      description:
        "Join the conversation. Discuss games, share tips, and connect with the community.",
      href: "/forum",
      color: "text-purple-400",
    },
    {
      icon: Monitor,
      title: "Streams",
      description:
        "Watch community members live. Featured streams and stream showcases.",
      href: "/streams",
      color: "text-red-400",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* ─── Hero Section ────────────────────────────────────────── */}
      <section className="text-center py-12 sm:py-20">
        <Badge
          variant="outline"
          className="mb-4 border-primary/30 text-primary"
        >
          <Gamepad2 className="mr-1 h-3 w-3" />
          Est. 2007
        </Badge>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
          Welcome to{" "}
          <span className="sg-text-gradient">Saints Gaming</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Saints Gaming: Time To Play. We've been a laid-back gaming community since
          2007, starting on TeamSpeak and SAMP. Right now, we're a chill space for everyone to hang out, chat, game together, and have a
          good time — no pressure, no drama.
        </p>

        <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto">
          We&apos;ve had Minecraft modpack servers, SA-MP servers, survival
          games — you name it. Whether you&apos;re into competitive play,
          modded Minecraft, or exploring The Lobby, there&apos;s a spot for you here.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <Link
            href="/lobby"
            className={buttonVariants({
              size: "lg",
              className:
                "bg-gradient-to-r from-amber-500 via-emerald-600 to-cyan-600 text-white font-black hover:opacity-95 px-8 rounded-xl shadow-xl shadow-amber-500/20 hover:shadow-amber-500/40 transition-all hover:scale-105 cursor-pointer border border-white/20",
            })}
          >
            <Gamepad2 className="mr-2 h-5 w-5 fill-current" />
            {realmName}
          </Link>
          <Link 
            href="/forum"
            className={buttonVariants({ size: "lg", variant: "secondary", className: "px-8 rounded-xl shadow-md border border-border/50 hover:bg-muted transition-all" })}
          >
            <MessageSquare className="mr-2 h-5 w-5" />
            Join the Forum
          </Link>
          <a
            href={process.env.NEXT_PUBLIC_DISCORD_INVITE || "https://discord.saintsgaming.net"}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "lg", className: "border-border/60 hover:border-primary/50 px-8 rounded-xl" })}
          >
            <Swords className="mr-2 h-5 w-5" />
            Join Discord
          </a>
        </div>
      </section>

      <Separator className="my-4" />

      {/* ─── Feature Cards ───────────────────────────────────────── */}
      <section className="py-12">
        <h2 className="text-2xl font-bold text-center mb-8">
          What&apos;s Here
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, description, href, color, badge, highlight }) => (
            <Link key={href} href={href} className={`group ${highlight ? "sm:col-span-2 lg:col-span-2" : ""}`}>
              <Card className={`h-full sg-3d-card transition-all ${highlight ? "bg-gradient-to-br from-amber-950/30 via-slate-900/60 to-emerald-950/30 border-amber-500/40 shadow-xl hover:border-amber-400" : "bg-card/50"}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div
                      className={`${color} mb-2 transition-transform group-hover:scale-110`}
                    >
                      <Icon className="h-8 w-8" />
                    </div>
                    {badge && (
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 font-mono text-xs">
                        {badge}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {title}
                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0 text-primary" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Community Vibe ──────────────────────────────────────── */}
      <section className="py-12">
        <Card className="sg-glass border-border/30 overflow-hidden">
          <CardContent className="p-8 sm:p-12">
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Users className="h-10 w-10 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">
                  For All Types of Gamers
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Whether you&apos;re grinding ranked, exploring modded worlds,
                  or just looking for people to play with — Saints Gaming is
                  your spot. We welcome gamers of all types. No elitism, no toxicity. Just gamers being gamers.
                  Jump into the action.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
