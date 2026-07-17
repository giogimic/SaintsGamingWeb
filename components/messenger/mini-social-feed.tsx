"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { User as UserIcon, Heart } from "lucide-react";
import { getMiniFeed } from "@/app/actions/social";

type MiniPost = {
  id: string;
  body: string;
  createdAt: Date;
  author: { username: string; image: string | null };
  _count: { reactions: number };
};

export function MiniSocialFeed() {
  const [posts, setPosts] = useState<MiniPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeed() {
      try {
        const feed = await getMiniFeed();
        setPosts(feed);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadFeed();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full p-4">
        <span className="text-sm text-muted-foreground animate-pulse">Loading FYP...</span>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No recent posts to show.
      </div>
    );
  }

  return (
    <div className="p-2 space-y-3 pb-6">
      {posts.map((post) => (
        <div key={post.id} className="p-3 bg-card border border-border/50 rounded-lg text-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-muted overflow-hidden relative shrink-0">
              {post.author.image ? (
                <Image src={post.author.image} alt={post.author.username} fill className="object-cover" />
              ) : (
                <UserIcon className="w-3 h-3 m-auto mt-1.5 text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center justify-between flex-1">
              <Link href={`/user/${post.author.username}`} className="font-semibold hover:underline truncate">
                {post.author.username}
              </Link>
              <span className="text-[10px] text-muted-foreground">
                {new Date(post.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <p className="whitespace-pre-wrap break-words text-muted-foreground leading-relaxed line-clamp-3">
            {post.body}
          </p>

          <div className="flex items-center justify-end gap-1 mt-2 text-xs text-muted-foreground">
            <Heart className="w-3 h-3" />
            <span>{post._count.reactions}</span>
          </div>
        </div>
      ))}
      <div className="text-center pt-2">
        <Link href="/ucp/social" className="text-xs text-primary hover:underline">
          View Full Dashboard →
        </Link>
      </div>
    </div>
  );
}
