import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { StreamGrid } from "@/components/streams/stream-grid";
import { MonitorPlay } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Community Streams | Saints Gaming",
  description: "Watch Saints Gaming community members streaming live.",
};

export default async function StreamsPage() {
  const streamers = await prisma.streamProfile.findMany({
    where: { isApproved: true },
    include: {
      user: {
        select: {
          username: true,
          displayName: true,
        }
      }
    },
    orderBy: [
      { isLive: "desc" },
      { priority: "desc" }
    ]
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold mb-3 flex items-center gap-3">
            <MonitorPlay className="h-10 w-10 text-primary" />
            Streams Hub
          </h1>
          <p className="text-xl text-muted-foreground">
            Watch Saints Gaming community members broadcast their gameplay.
          </p>
        </div>
        
        <div className="shrink-0 bg-primary/10 border border-primary/20 rounded-lg p-4 max-w-sm text-sm">
          <p className="mb-3 text-muted-foreground">Are you a community member who streams?</p>
          <Button asChild className="w-full">
            <Link href="/profile">Apply for Stream Team</Link>
          </Button>
        </div>
      </div>

      <StreamGrid streamers={streamers} />
    </div>
  );
}
