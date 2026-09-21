"use client";

import { useEffect, useState } from "react";
import { getUserActivityFeed, ActivityItem } from "@/app/actions/user/activity";
import { Loader2, MessageSquare, PenSquare, MessagesSquare, Milestone, ExternalLink } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export function ActivityFeed({ username, showMilestones }: { username: string, showMilestones: boolean }) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const feed = await getUserActivityFeed(username, 30);
        setActivities(feed);
      } catch (error) {
        console.error("Failed to load activity feed", error);
      } finally {
        setLoading(false);
      }
    }
    fetchActivity();
  }, [username, showMilestones]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading activity...</span>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="p-8 border border-dashed rounded-xl text-center text-muted-foreground bg-muted/20">
        <MessagesSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
        <p className="text-sm">No recent activity to show.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative border-l border-border/50 ml-3 md:ml-4 space-y-8 pb-4">
        {activities.map((item) => (
          <ActivityCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function ActivityCard({ item }: { item: ActivityItem }) {
  const Icon = () => {
    switch (item.type) {
      case "POST": return <PenSquare className="w-4 h-4 text-[rgb(var(--profile-accent))]" />;
      case "THREAD": return <MessagesSquare className="w-4 h-4 text-[rgb(var(--profile-accent))]" />;
      case "REPLY": return <MessageSquare className="w-4 h-4 text-muted-foreground" />;
      case "MILESTONE": return <Milestone className="w-4 h-4 text-primary" />;
      default: return <div className="w-2 h-2 rounded-full bg-[rgb(var(--profile-accent))]" />;
    }
  };

  return (
    <div className="relative pl-6 md:pl-8">
      {/* Timeline Dot */}
      <div className="absolute -left-[1.3rem] top-1 w-10 h-10 rounded-full bg-background border-2 border-border flex items-center justify-center z-10 shadow-sm">
        <Icon />
      </div>

      <div className="bg-card/40 hover:bg-card border border-border/50 rounded-xl p-4 md:p-5 transition-colors shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {item.type === "POST" && <span className="font-semibold text-foreground">Posted an update</span>}
            {item.type === "THREAD" && <span className="font-semibold text-foreground">Started a thread</span>}
            {item.type === "REPLY" && <span className="font-semibold text-foreground">Replied to a thread</span>}
            {item.type === "MILESTONE" && <span className="font-semibold text-foreground">Milestone</span>}
            <span>•</span>
            <time dateTime={new Date(item.createdAt).toISOString()}>
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </time>
          </div>
          
          <Link href={item.url} className="text-muted-foreground hover:text-[rgb(var(--profile-accent))] transition-colors shrink-0">
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>

        {item.type === "THREAD" && item.metadata?.subcategory && (
          <span className="inline-block px-2 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground mb-2">
            in {item.metadata.subcategory}
          </span>
        )}

        <div className="text-foreground whitespace-pre-wrap text-sm md:text-base leading-relaxed">
          {item.content}
        </div>
        
        {item.type === "REPLY" && item.metadata?.excerpt && (
          <div className="mt-3 pl-3 border-l-2 border-muted text-muted-foreground text-sm italic">
            &quot;{item.metadata.excerpt}&quot;
          </div>
        )}

        {item.type === "POST" && item.metadata?.mediaUrl && (
          <div className="mt-4 rounded-lg overflow-hidden border border-border/50 max-w-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.metadata.mediaUrl} alt="Post media" className="w-full h-auto object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}
