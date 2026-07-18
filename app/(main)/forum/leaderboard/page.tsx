import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { Trophy, Medal } from "lucide-react";

export const metadata: Metadata = {
  title: "Leaderboard | Forums",
  description: "Top contributing members of the Saints Gaming community.",
};

export default async function LeaderboardPage() {
  const topUsers = await prisma.user.findMany({
    take: 50,
    orderBy: [
      { level: "desc" },
      { xp: "desc" }
    ],
    select: {
      id: true,
      username: true,
      image: true,
      level: true,
      xp: true,
      createdAt: true,
      isVIP: true,
      isFounder: true,
      isTrusted: true,
      role: { select: { name: true, color: true } }
    }
  });

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 text-center">
        <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Community Leaderboard</h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          Recognizing our most active and helpful community members based on their experience points (XP) and level.
        </p>
      </div>

      <div className="sg-glass border border-border/50 rounded-xl overflow-hidden bg-card/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/30 border-b border-border/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-semibold w-16 text-center">Rank</th>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold text-center">Level</th>
                <th className="px-6 py-4 font-semibold text-right">XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {topUsers.map((user, idx) => {
                const isTop3 = idx < 3;
                return (
                  <tr key={user.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 text-center font-bold">
                      {idx === 0 ? <Medal className="h-6 w-6 text-yellow-500 mx-auto" /> :
                       idx === 1 ? <Medal className="h-6 w-6 text-gray-400 mx-auto" /> :
                       idx === 2 ? <Medal className="h-6 w-6 text-amber-700 mx-auto" /> :
                       <span className="text-muted-foreground">{idx + 1}</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.image ? (
                          <Image src={user.image} alt={user.username} width={40} height={40} className={`rounded-full object-cover border-2 ${isTop3 ? 'border-primary' : 'border-border/50'}`} />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${isTop3 ? 'bg-primary/20 text-primary border-primary/50' : 'bg-muted border-border/50 text-muted-foreground'}`}>
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <Link href={`/user/${user.username}`} className={`font-bold hover:underline block ${isTop3 ? 'text-primary text-base' : 'text-foreground'}`}>
                            {user.username}
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5">
                            {user.role && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-background/50 border border-border/50 ${user.role.color || "text-foreground"}`}>
                                {user.role.name}
                              </span>
                            )}
                            {user.isFounder && <span className="text-[10px] text-yellow-500 font-bold border border-yellow-500/30 bg-yellow-500/10 px-1.5 py-0.5 rounded-sm">FOUNDER</span>}
                            {user.isVIP && <span className="text-[10px] text-purple-500 font-bold border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 rounded-sm">VIP</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center bg-primary/10 text-primary font-bold w-8 h-8 rounded-full border border-primary/20">
                        {user.level}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                      {user.xp.toLocaleString()} XP
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
