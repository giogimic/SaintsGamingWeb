import { prisma } from "@/lib/prisma";
import { StreamManager } from "@/components/admin/stream-manager";

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
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stream Approvals</h1>
        <p className="text-muted-foreground mt-2">
          Review community stream submissions, approve channels, and set their front-page priority.
        </p>
      </div>

      <div className="bg-card/50 border border-border/40 rounded-xl p-6">
        <StreamManager initialProfiles={profiles} />
      </div>
    </div>
  );
}
