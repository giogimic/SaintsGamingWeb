"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useRealtimeStore } from "@/web/hooks/useRealtimeStore";
import { toast } from "sonner";

/**
 * Registers the current thread for live `forum.reply.created` updates.
 * On a new reply from another user, refreshes the server-rendered thread.
 */
export function LiveThreadReplies({
  threadId,
  currentUserId,
}: {
  threadId: string;
  currentUserId?: string | null;
}) {
  const router = useRouter();
  const setWatchedThreadId = useRealtimeStore((s) => s.setWatchedThreadId);
  const lastForumReply = useRealtimeStore((s) => s.lastForumReply);
  const handledReplyId = useRef<string | null>(null);

  useEffect(() => {
    setWatchedThreadId(threadId);
    return () => setWatchedThreadId(null);
  }, [threadId, setWatchedThreadId]);

  useEffect(() => {
    if (!lastForumReply) return;
    if (lastForumReply.threadId !== threadId) return;
    if (lastForumReply.replyId === handledReplyId.current) return;
    if (currentUserId && lastForumReply.authorId === currentUserId) return;

    handledReplyId.current = lastForumReply.replyId;
    toast.message(`${lastForumReply.authorName} replied`, {
      description: lastForumReply.excerpt.slice(0, 120),
      action: {
        label: "Refresh",
        onClick: () => router.refresh(),
      },
    });
    router.refresh();
  }, [lastForumReply, threadId, currentUserId, router]);

  return null;
}
