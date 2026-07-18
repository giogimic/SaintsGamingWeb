"use client";

import { Shield, MessageSquare, Newspaper, Coins, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ActivityStatsProps {
  profile: {
    level: number;
    xp: number;
    coins: number;
    _count: {
      threads: number;
      replies: number;
      socialPosts: number;
    };
  };
}

export function ActivityStats({ profile }: ActivityStatsProps) {
  // Simple calculation for XP to next level, assuming it scales like level * 1000
  const xpRequiredForNextLevel = profile.level * 1000;
  const xpProgress = Math.min(100, Math.max(0, (profile.xp / xpRequiredForNextLevel) * 100));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2 sg-text-gradient">
          <Shield className="w-6 h-6 text-primary" />
          Activity & Stats
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Level & XP Card */}
        <div className="lg:col-span-2 sg-glass rounded-xl p-5 border border-border/50 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
              <span className="font-semibold">Level {profile.level}</span>
            </div>
            <span className="text-sm font-medium text-muted-foreground">{profile.xp} / {xpRequiredForNextLevel} XP</span>
          </div>
          <Progress value={xpProgress} className="h-2 bg-white/10" />
        </div>

        {/* Coins */}
        <div className="sg-glass rounded-xl p-5 border border-border/50 flex items-center gap-4 group">
          <div className="p-3 bg-yellow-500/10 rounded-lg group-hover:bg-yellow-500/20 transition-colors">
            <Coins className="w-6 h-6 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground font-medium">Saints Coins</div>
            <div className="text-2xl font-bold">{profile.coins.toLocaleString()}</div>
          </div>
        </div>

        {/* Forum Stats */}
        <div className="sg-glass rounded-xl p-5 border border-border/50 flex items-center gap-4 group">
          <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
            <MessageSquare className="w-6 h-6 text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground font-medium">Forum Posts</div>
            <div className="text-2xl font-bold">{(profile._count.threads + profile._count.replies).toLocaleString()}</div>
          </div>
        </div>

        {/* Social Posts */}
        <div className="sg-glass rounded-xl p-5 border border-border/50 flex items-center gap-4 group">
          <div className="p-3 bg-pink-500/10 rounded-lg group-hover:bg-pink-500/20 transition-colors">
            <Newspaper className="w-6 h-6 text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)] group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground font-medium">Social Posts</div>
            <div className="text-2xl font-bold">{profile._count.socialPosts.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
