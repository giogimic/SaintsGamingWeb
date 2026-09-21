"use client";

import { Users } from "lucide-react";

export function FriendsTab({ userId }: { userId: string }) {
  return (
    <div className="space-y-6">
      <div className="p-8 border border-dashed rounded-xl text-center text-muted-foreground bg-muted/20">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
        <p className="text-sm">Friend list is hidden or empty.</p>
      </div>
    </div>
  );
}
