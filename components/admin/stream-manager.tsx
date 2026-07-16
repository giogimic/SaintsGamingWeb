"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ExternalLink, ShieldCheck, ShieldAlert } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Profile = any;  

export function StreamManager({ initialProfiles }: { initialProfiles: Profile[] }) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleUpdate = async (id: string, isApproved: boolean, priority: number) => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isApproved, priority: Number(priority) }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-border/50">
      <table className="w-full text-sm text-left bg-background">
        <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
          <tr>
            <th className="px-4 py-3 font-medium">User</th>
            <th className="px-4 py-3 font-medium">Platform & Link</th>
            <th className="px-4 py-3 font-medium">Live Status</th>
            <th className="px-4 py-3 font-medium">Approved</th>
            <th className="px-4 py-3 font-medium w-32">Priority</th>
            <th className="px-4 py-3 font-medium text-right">Submitted</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {initialProfiles.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                No stream profiles submitted yet.
              </td>
            </tr>
          ) : (
            initialProfiles.map((profile: Profile) => (
              <tr key={profile.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium">{profile.user.username}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {profile.platform}
                    </span>
                    <a href={profile.channelUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center">
                      <span className="line-clamp-1 max-w-[150px]">{profile.channelUrl.replace('https://', '')}</span>
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {profile.isLive ? (
                    <span className="flex items-center text-xs font-bold text-red-500">
                      <span className="relative flex h-2 w-2 mr-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                      LIVE
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs font-medium">OFFLINE</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={profile.isApproved} 
                      onCheckedChange={(checked) => handleUpdate(profile.id, checked, profile.priority)}
                      disabled={updatingId === profile.id}
                    />
                    {profile.isApproved ? (
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Input 
                    type="number" 
                    min="0" 
                    max="100" 
                    defaultValue={profile.priority}
                    className="h-8 w-20"
                    disabled={updatingId === profile.id}
                    onBlur={(e) => {
                      const newPrio = parseInt(e.target.value, 10);
                      if (newPrio !== profile.priority && !isNaN(newPrio)) {
                        handleUpdate(profile.id, profile.isApproved, newPrio);
                      }
                    }}
                  />
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(profile.createdAt), { addSuffix: true })}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
