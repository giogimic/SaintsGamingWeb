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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Saints Gaming - Game Servers, Mod Packs, Community its Time To Play!",
};

const FEATURES = [
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

export default function HomePage() {
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
          We&apos;re a laid-back gaming community that&apos;s been around since
          2007. Not always running, but always here. Right now, we&apos;re a
          chill space for people to hang out, chat, game together, and have a
          good time — no pressure, no drama.
        </p>

        <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto">
          We&apos;ve had Minecraft modpack servers, SA-MP servers, survival
          games — you name it. Whether you&apos;re into competitive play,
          modded Minecraft, or just vibing, there&apos;s a spot for you here.
          We&apos;re building something and you&apos;re welcome to be part of
          it.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <Link 
            href="/forum"
            className={buttonVariants({ size: "lg", className: "bg-primary text-primary-foreground hover:bg-primary/90 px-8 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all sg-pulse-btn" })}
          >
            <MessageSquare className="mr-2 h-5 w-5" />
            Join the Forum
          </Link>
          <a
            href={process.env.NEXT_PUBLIC_DISCORD_INVITE || "#"}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, description, href, color }) => (
            <Link key={href} href={href} className="group">
              <Card className="h-full sg-3d-card bg-card/50">
                <CardHeader className="pb-3">
                  <div
                    className={`${color} mb-2 transition-transform group-hover:scale-110`}
                  >
                    <Icon className="h-8 w-8" />
                  </div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {title}
                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0 text-primary" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{description}</p>
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
                  your spot. No elitism, no toxicity. Just gamers being gamers.
                  We&apos;re small right now, but that&apos;s what makes it
                  real. Come build with us.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
