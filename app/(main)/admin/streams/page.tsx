import { prisma } from "@/web/lib/prisma";
import { StreamManager } from "@/web/components/admin/stream-manager";

export const metadata = {
  title: "Admin - Stream Approvals",
};

export default async function AdminStreamsPage() {
  const profiles = await prisma.streamProfile.findMany({
    orderBy: [
      { isApproved: "asc" }, // Unapproved first
      { priority: "desc" },
      { createdAt: "desc" }
    ],
    include: {
      user: { select: { username: true } },
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Community &amp; Content</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">Creator Broadcasts</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            Stream Approvals &amp; Priority
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review submitted Twitch, YouTube, and Kick creator channels, grant authorization, and bump featured stream priorities.
          </p>
        </div>
      </div>

      <div className="bg-card/40 border border-border/50 rounded-xl p-6 sg-glass">
        <StreamManager initialProfiles={profiles} />
      </div>
    </div>
  );
}
