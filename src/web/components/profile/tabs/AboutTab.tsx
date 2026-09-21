"use client";

import { User as UserIcon } from "lucide-react";

export function AboutTab({ profile }: { profile: any }) {
  return (
    <div className="space-y-6">
      <div className="bg-card/40 border border-border/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-[rgb(var(--profile-accent))]" />
          About {profile.username}
        </h3>
        
        {profile.bio ? (
          <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {profile.bio}
          </div>
        ) : (
          <p className="text-muted-foreground italic">No bio provided.</p>
        )}
      </div>
    </div>
  );
}
