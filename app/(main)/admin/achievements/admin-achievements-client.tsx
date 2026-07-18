"use client";

import { useState } from "react";
import { grantAchievement, revokeAchievement } from "@/app/actions/achievements";
import { ACHIEVEMENTS, getAchievementDef } from "@/lib/achievements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { Trash2 } from "lucide-react";

export function AdminAchievementsClient({ initialRecent }: { initialRecent: any[] }) {
  const [username, setUsername] = useState("");
  const [selectedBadge, setSelectedBadge] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentLog, setRecentLog] = useState(initialRecent);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !selectedBadge) {
      toast.error("Please provide both a username and an achievement.");
      return;
    }

    setIsSubmitting(true);
    const res = await grantAchievement(username, selectedBadge);
    setIsSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Successfully awarded ${getAchievementDef(selectedBadge)?.title} to ${username}!`);
      setUsername("");
      setSelectedBadge("");
      // Refresh the page to get the latest recent log (or we could fetch again, but simple reload works)
      window.location.reload();
    }
  };

  const handleRevoke = async (id: string, username: string, title: string) => {
    if (!confirm(`Are you sure you want to revoke "${title}" from ${username}?`)) return;

    const res = await revokeAchievement(id);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Achievement revoked.");
      setRecentLog(prev => prev.filter(a => a.id !== id));
    }
  };

  return (
    <div className="space-y-8">
      {/* Award Form */}
      <div className="sg-glass p-6 rounded-xl border border-border/50">
        <h2 className="text-xl font-bold mb-4">Manually Award Achievement</h2>
        <form onSubmit={handleGrant} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="space-y-2 flex-1">
            <label className="text-sm font-medium">Username</label>
            <Input 
              placeholder="e.g. giogimic" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
            />
          </div>
          <div className="space-y-2 flex-1">
            <label className="text-sm font-medium">Achievement</label>
            <Select value={selectedBadge} onValueChange={(v) => setSelectedBadge(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select an achievement..." />
              </SelectTrigger>
              <SelectContent>
                {Object.values(ACHIEVEMENTS).map(ach => (
                  <SelectItem key={ach.id} value={ach.id}>
                    {ach.title} ({ach.rarity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={isSubmitting || !username || !selectedBadge}>
            {isSubmitting ? "Awarding..." : "Award Achievement"}
          </Button>
        </form>
      </div>

      {/* Audit Log */}
      <div>
        <h2 className="text-xl font-bold mb-4">Recent Grants Audit Log</h2>
        <div className="sg-glass rounded-xl border border-border/50 overflow-hidden">
          {recentLog.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No recent achievements awarded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                  <tr>
                    <th className="px-6 py-3">User</th>
                    <th className="px-6 py-3">Achievement</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {recentLog.map((log) => {
                    const def = getAchievementDef(log.badgeId);
                    return (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-medium flex items-center gap-3">
                          {log.user.image ? (
                            <Image src={log.user.image} alt={log.user.username} width={24} height={24} className="rounded-full" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-muted"></div>
                          )}
                          {log.user.username}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-bold ${def?.colorClass}`}>{def?.title || log.badgeId}</span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {formatDistanceToNow(new Date(log.earnedAt), { addSuffix: true })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="h-8 px-2 text-xs"
                            onClick={() => handleRevoke(log.id, log.user.username, def?.title || log.badgeId)}
                          >
                            <Trash2 className="w-3 h-3 mr-1" /> Revoke
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
