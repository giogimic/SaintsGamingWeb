"use client";

import { useMessenger } from "./messenger-provider";
import { FriendsList } from "./friends-list";
import { ChatWindow } from "./chat-window";
import { MiniSocialFeed } from "./mini-social-feed";
import { MessageCircle, X, Coins, Users, Bell } from "lucide-react";
import { Button } from "@/web/components/ui/button";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { getMessengerMetadata } from "@/app/actions/messenger";

export function MessengerPopup() {
  const { data: session } = useSession();
  const { isOpen, setIsOpen, activeChat, isCryptoReady } = useMessenger();
  const [activeTab, setActiveTab] = useState<"friends" | "feed">("friends");
  const pathname = usePathname();
  const [meta, setMeta] = useState({ unreadCount: 0, coins: 0, totalFriends: 0 });

  useEffect(() => {
    if (session?.user) {
      getMessengerMetadata().then(setMeta).catch(console.error);
    }
  }, [isOpen, session?.user]);

  if (!session?.user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-12 sm:bottom-14 right-3 sm:right-6 w-80 sm:w-96 h-[480px] max-h-[75vh] bg-card/95 backdrop-blur-2xl border border-primary/40 rounded-xl shadow-2xl flex flex-col overflow-hidden z-[300] pointer-events-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border/50 bg-black/40">
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-foreground">
                {activeChat ? activeChat.username : "Friends & Chat"}
              </span>
              {!isCryptoReady && (
                <span className="text-[10px] text-destructive animate-pulse">Initializing E2EE...</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden relative flex flex-col">
            {!activeChat && (
              <div className="flex border-b border-border/50 bg-muted/10 shrink-0">
                <button
                  className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                    activeTab === "friends"
                      ? "text-primary border-b-2 border-primary bg-primary/5"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setActiveTab("friends")}
                >
                  Friends
                </button>
                <button
                  className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                    activeTab === "feed"
                      ? "text-primary border-b-2 border-primary bg-primary/5"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setActiveTab("feed")}
                >
                  The Feed
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto relative">
              {activeChat ? (
                <ChatWindow />
              ) : activeTab === "friends" ? (
                <FriendsList />
              ) : (
                <>{activeTab === "feed" && <MiniSocialFeed />}</>
              )}
            </div>
          </div>

          {/* Bottom Info Bar */}
          <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-black/40 border-t border-border/50 text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-help"
                title="Unread Messages"
              >
                <div className="relative">
                  <Bell className="w-3.5 h-3.5" />
                  {meta.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
                  )}
                </div>
                <span>{meta.unreadCount}</span>
              </div>
              <div className="w-px h-3 bg-border/50" />
              <div
                className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-help"
                title="Total Friends"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{meta.totalFriends}</span>
              </div>
            </div>

            <div
              className="flex items-center gap-1.5 text-amber-400 font-bold"
              title="Global Gold"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>{meta.coins.toLocaleString()} C</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
