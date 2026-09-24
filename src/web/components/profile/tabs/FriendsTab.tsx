"use client";

import { useEffect, useState } from "react";
import { getProfileFriends } from "@/app/actions/user/users";
import { Loader2, Users, Crown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type Friend = {
  id: string;
  username: string;
  displayName: string | null;
  image: string | null;
  level: number;
  isVIP: boolean;
  friendsSince: Date;
};

export function FriendsTab({ userId }: { userId: string }) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    async function fetchFriends() {
      try {
        const { friends, hasMore } = await getProfileFriends(userId, page, 20);
        setFriends(prev => page === 1 ? friends : [...prev, ...friends]);
        setHasMore(hasMore);
      } catch (error) {
        console.error("Failed to load friends", error);
      } finally {
        setLoading(false);
      }
    }
    fetchFriends();
  }, [userId, page]);

  if (loading && page === 1) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading friends...</span>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="p-8 border border-dashed rounded-xl text-center text-muted-foreground bg-muted/20">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
        <p className="text-sm">No visible friends to show.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {friends.map((friend) => (
          <Link 
            key={friend.id} 
            href={`/user/${friend.username}`}
            className="group relative rounded-xl overflow-hidden border border-border/50 bg-card/40 backdrop-blur-sm transition-all hover:border-[rgb(var(--profile-accent))]/50 hover:shadow-lg p-4 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full overflow-hidden bg-muted border border-border shrink-0">
              {friend.image ? (
                <Image src={friend.image} alt={friend.username} width={48} height={48} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-sm font-bold">
                  {friend.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm leading-tight truncate flex items-center gap-1.5">
                {friend.displayName || friend.username}
                {friend.isVIP && <Crown className="w-3 h-3 text-blue-500 fill-blue-500 shrink-0" />}
              </h3>
              <p className="text-xs text-muted-foreground truncate mt-0.5">@{friend.username}</p>
              <p className="text-xs font-semibold text-[rgb(var(--profile-accent))] mt-1">Lv {friend.level}</p>
            </div>
          </Link>
        ))}
      </div>
      
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button 
            onClick={() => setPage(p => p + 1)}
            disabled={loading}
            className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
