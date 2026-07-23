import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getTopLobbyOperatives } from '@/app/actions/game';
import { Trophy, Crown, BadgeCheck, ShieldCheck, User, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Global Operatives Leaderboards | Saints Gaming',
  description: 'View the top ranked Saints Tamer operatives, rich list economy rankings, and master beast tamers across the community.',
};

export default async function LeaderboardsPage() {
  const res = await getTopLobbyOperatives();
  const operatives = res.success ? res.data : [];

  // Sortings for tabs
  const topLevel = [...operatives].sort((a, b) => (b.level * 100000 + b.totalXp) - (a.level * 100000 + a.totalXp));
  const richList = [...operatives].sort((a, b) => b.credits - a.credits);
  const masterTamers = [...operatives].sort((a, b) => b.caughtCount - a.caughtCount);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 animate-in fade-in duration-500 font-sans">
      
      {/* Header Banner */}
      <div className="text-center space-y-4 bg-gradient-to-r from-purple-900/40 via-emerald-900/40 to-slate-900/40 border border-emerald-500/30 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-center gap-2 text-emerald-400 font-mono text-sm font-bold uppercase tracking-widest">
          <Trophy className="w-5 h-5" /> SAINTS TAMER GLOBAL RANKINGS
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 via-emerald-400 to-amber-400 bg-clip-text text-transparent">
          OPERATIVE LEADERBOARDS
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
          Explore top operatives competing across the campaign region. Ranks are synchronized in real-time from character levels, 27-skill progression, economy credits, and bound beast species.
        </p>
      </div>

      {/* Leaderboard Table Container */}
      <div className="bg-card/80 border border-border/50 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-6">
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            Top Operatives Directory
          </h2>
          <span className="text-xs text-muted-foreground font-mono">Total Tracked: {operatives.length}</span>
        </div>

        {operatives.length === 0 ? (
          <div className="p-12 border border-dashed rounded-xl text-center text-muted-foreground italic font-mono">
            No active operatives recorded yet. Enter The Lobby to create your character!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/40 text-xs text-muted-foreground uppercase font-mono tracking-wider">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Operative</th>
                  <th className="py-3 px-4">Class & Perk</th>
                  <th className="py-3 px-4">Level</th>
                  <th className="py-3 px-4">Total Skill XP</th>
                  <th className="py-3 px-4">Credits</th>
                  <th className="py-3 px-4">Beasts Bound</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 text-sm">
                {topLevel.map((op, idx) => (
                  <tr key={op.id} className="hover:bg-muted/30 transition-colors">
                    {/* Rank Badge */}
                    <td className="py-4 px-4 font-mono font-bold">
                      {idx === 0 && <span className="text-amber-400 font-extrabold text-base flex items-center gap-1">🥇 #1</span>}
                      {idx === 1 && <span className="text-slate-300 font-extrabold text-base flex items-center gap-1">🥈 #2</span>}
                      {idx === 2 && <span className="text-amber-600 font-extrabold text-base flex items-center gap-1">🥉 #3</span>}
                      {idx > 2 && <span className="text-muted-foreground">#{idx + 1}</span>}
                    </td>

                    {/* Operative & User */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted border border-border/60 flex items-center justify-center overflow-hidden shrink-0">
                          {op.user?.image ? (
                            <Image src={op.user.image} alt={op.name} width={40} height={40} className="object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-foreground flex items-center gap-1.5">
                            <span>{op.name}</span>
                            {op.user?.isFounder && <span title="Founder"><Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" /></span>}
                            {op.user?.isVIP && <span title="VIP"><BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500" /></span>}
                            {op.user?.isTrusted && <span title="Trusted User"><ShieldCheck className="w-4 h-4 text-green-500 fill-green-500" /></span>}
                          </div>
                          {op.user?.username && (
                            <Link href={`/user/${encodeURIComponent(op.user.username)}`} className="text-xs text-primary hover:underline font-mono">
                              @{op.user.username}
                            </Link>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Class & Perk */}
                    <td className="py-4 px-4 font-mono">
                      <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary border border-primary/30 rounded font-bold uppercase">
                        {op.classId}
                      </span>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{op.perk.replace('_', ' ')}</div>
                    </td>

                    {/* Level */}
                    <td className="py-4 px-4 font-mono font-bold text-emerald-400">
                      LVL {op.level}
                    </td>

                    {/* Total Skill XP */}
                    <td className="py-4 px-4 font-mono text-slate-300">
                      {op.totalXp.toLocaleString()} XP
                    </td>

                    {/* Credits */}
                    <td className="py-4 px-4 font-mono font-bold text-amber-400">
                      {op.credits.toLocaleString()} C
                    </td>

                    {/* Beasts Bound */}
                    <td className="py-4 px-4 font-mono text-purple-400 font-bold">
                      {op.caughtCount} Species
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
