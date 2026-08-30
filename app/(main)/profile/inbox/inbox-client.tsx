"use client";

import { useState, useEffect, useRef } from "react";
import { 
  getFriendsList, getMessages, sendMessage, getPublicKey, 
  deleteMessage, clearChatHistory, createGroupChat, getGroupChats, 
  getGroupMessages, sendGroupMessage, leaveGroupChat
} from "@/app/actions/messenger";
import { importPrivateKey, importPublicKey, deriveSharedKey, encryptMessage, decryptMessage, getLocalPrivateKey } from "@/web/lib/crypto";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { 
  ArrowLeft, Send, Lock, Loader2, Trash2, Search, Compass, Users, 
  Plus, Check, MessageSquare, ShieldCheck, Sparkles, X, UserCheck,
  Flame, Gamepad2, Layers
} from "lucide-react";
import Image from "next/image";
import { TheFeed, type FeedTabType } from "./the-feed";

type ChatType = "FEED" | "MESSAGES" | "DM" | "GROUP";

const GAME_HUBS = [
  { id: "all", label: "All Activity", icon: Compass, filter: null, tab: "for-you" as const },
  { id: "clips", label: "Clips & Reels", icon: Sparkles, color: "text-pink-400", filter: null, tab: "clips" as const },
  { id: "trending", label: "Hot & Trending", icon: Flame, color: "text-orange-400", filter: null, tab: "trending" as const },
  { id: "mmo", label: "Saints MMO", icon: Gamepad2, color: "text-amber-400", filter: "mmo", tab: "for-you" as const },
  { id: "fivem", label: "FiveM Moments", icon: Flame, color: "text-orange-400", filter: "fivem", tab: "for-you" as const },
  { id: "minecraft", label: "Minecraft Modpacks", icon: Layers, color: "text-emerald-400", filter: "minecraft", tab: "for-you" as const },
  { id: "hangout", label: "Community Hangout", icon: MessageSquare, color: "text-violet-400", filter: "hangout", tab: "for-you" as const },
];

export function InboxClient() {
  const [activeChatType, setActiveChatType] = useState<ChatType>("FEED");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeFeedTab, setActiveFeedTab] = useState<FeedTabType>("for-you");

  const [friends, setFriends] = useState<any[]>([]);
  const [groupChats, setGroupChats] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sharedKey, setSharedKey] = useState<CryptoKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  
  // Group creation state
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial Load
  useEffect(() => {
    async function loadData() {
      const data = await getFriendsList();
      setFriends(data.friends || []);
      const groups = await getGroupChats();
      setGroupChats(groups || []);
    }
    loadData();
  }, []);

  const activeFriend = activeChatType === "DM" ? friends.find(f => f.user?.id === activeId)?.user : null;
  const activeGroup = activeChatType === "GROUP" ? groupChats.find(g => g.id === activeId) : null;

  // Setup Keys for DM
  useEffect(() => {
    async function setupKeys() {
      if (activeChatType !== "DM" || !activeId) return;
      setError(null);
      setSharedKey(null);
      setMessages([]);
      
      try {
        const pkBase64 = getLocalPrivateKey();
        if (!pkBase64) throw new Error("Device not linked for E2EE.");
        
        const myPrivKey = await importPrivateKey(pkBase64);
        const friendPkBase64 = await getPublicKey(activeId);
        
        if (!friendPkBase64) throw new Error("Friend has not setup E2EE yet.");
        const friendPubKey = await importPublicKey(friendPkBase64);
        
        const key = await deriveSharedKey(myPrivKey, friendPubKey);
        setSharedKey(key);
      } catch (err: any) {
        setError(err.message || "Key exchange failed.");
      }
    }
    setupKeys();
  }, [activeChatType, activeId]);

  // Fetch Messages
  async function fetchMessages() {
    if (activeChatType === "DM" && activeId && sharedKey) {
      try {
        const encryptedMsgs = await getMessages(activeId);
        const decrypted = await Promise.all(
          encryptedMsgs.map(async (msg) => {
            try {
              const text = await decryptMessage(sharedKey, msg.ciphertext, msg.iv);
              return { ...msg, text };
            } catch {
              return { ...msg, text: "[Decryption Failed]" };
            }
          })
        );
        setMessages(prev => {
          if (prev.length !== decrypted.length) return decrypted;
          if (prev.length > 0 && prev[prev.length - 1].id !== decrypted[decrypted.length - 1].id) {
            return decrypted;
          }
          return prev;
        });
      } catch (e) {
        console.error(e);
      }
    } else if (activeChatType === "GROUP" && activeId) {
      try {
        const msgs = await getGroupMessages(activeId);
        setMessages(prev => {
          if (prev.length !== msgs.length) return msgs;
          return prev;
        });
      } catch (e) {
        console.error(e);
      }
    }
  }

  // Polling
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatType, activeId, sharedKey]);

  // Scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeId) return;

    if (activeChatType === "DM" && !sharedKey) return;

    const textToSend = inputText;
    setInputText("");
    setIsSending(true);

    try {
      if (activeChatType === "DM" && sharedKey) {
        const { ciphertext, iv } = await encryptMessage(sharedKey, textToSend);
        await sendMessage(activeId, ciphertext, iv, ciphertext, iv);
      } else if (activeChatType === "GROUP") {
        await sendGroupMessage(activeId, textToSend);
      }
      await fetchMessages();
    } catch (err) {
      console.error(err);
      setError("Failed to send message");
    } finally {
      setIsSending(false);
    }
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim() || selectedFriends.length === 0) return;
    try {
      const g = await createGroupChat(newGroupName, selectedFriends);
      setGroupChats(prev => [...prev, g]);
      setIsCreatingGroup(false);
      setNewGroupName("");
      setSelectedFriends([]);
      setActiveChatType("GROUP");
      setActiveId(g.id);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDeleteMessage(id: string) {
    if (activeChatType !== "DM") return;
    try {
      await deleteMessage(id);
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  async function handleClearHistory() {
    if (activeChatType !== "DM" || !activeId) return;
    try {
      await clearChatHistory(activeId);
      setMessages([]);
    } catch (e) {
      console.error(e);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const filteredFriends = friends.filter(f => 
    !searchQuery || f.user?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groupChats.filter(g => 
    !searchQuery || g.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderSidebarContent = () => (
    <>
      {/* Feeds & Game Hubs Section */}
      <div className="p-3 border-b border-border/50 space-y-1">
        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 flex items-center justify-between">
          <span>Feeds & Game Hubs</span>
          <Sparkles className="w-3 h-3 text-primary" />
        </div>
        <div className="space-y-0.5">
          {GAME_HUBS.map((hub) => {
            const isHubActive = 
              activeChatType === "FEED" && 
              ((hub.filter === null && hub.tab === activeFeedTab && activeFilter === null) ||
               (hub.filter !== null && activeFilter === hub.filter));
            const Icon = hub.icon;
            return (
              <button
                key={hub.id}
                type="button"
                onClick={() => {
                  setActiveChatType("FEED");
                  setActiveId(null);
                  setActiveFilter(hub.filter);
                  setActiveFeedTab(hub.tab);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                  isHubActive
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isHubActive ? "text-primary-foreground" : hub.color || "text-primary"}`} />
                <span className="truncate">{hub.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Messenger Header & Search */}
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span>Direct Chats & Groups</span>
          </h2>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-6 text-[11px] rounded-full border-primary/30 hover:bg-primary/10 gap-1 px-2.5"
            onClick={() => setIsCreatingGroup(!isCreatingGroup)}
          >
            <Plus className="h-3 w-3" />
            <span>Group</span>
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input 
            className="pl-8 bg-background/80 h-8 text-xs rounded-full border-border/50" 
            placeholder="Search chats & friends..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {/* Groups Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5 mt-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Group Chats ({filteredGroups.length})</span>
          </div>

          {isCreatingGroup && (
            <div className="p-3 bg-background rounded-xl border border-primary/40 mb-2 space-y-2.5 shadow-md animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary">New Group Chat</span>
                <button onClick={() => setIsCreatingGroup(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <Input placeholder="Group Name" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} className="h-8 text-xs rounded-lg" />
              <div className="max-h-32 overflow-y-auto space-y-1">
                {friends.map(f => (
                  <div key={f.user?.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1.5 rounded-md transition-colors" onClick={() => {
                    if (selectedFriends.includes(f.user?.id)) setSelectedFriends(prev => prev.filter(id => id !== f.user?.id));
                    else setSelectedFriends(prev => [...prev, f.user?.id]);
                  }}>
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 ${selectedFriends.includes(f.user?.id) ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>
                      {selectedFriends.includes(f.user?.id) && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <span className="text-xs font-medium truncate">{f.user?.username}</span>
                  </div>
                ))}
              </div>
              <Button size="sm" className="w-full h-7 text-xs font-bold rounded-lg" onClick={handleCreateGroup} disabled={!newGroupName || selectedFriends.length === 0}>
                Create Group
              </Button>
            </div>
          )}

          <div className="space-y-1">
            {filteredGroups.length === 0 && !isCreatingGroup && (
              <p className="text-[11px] text-muted-foreground px-2 py-1">No group chats found.</p>
            )}
            {filteredGroups.map(g => (
              <button
                key={g.id}
                onClick={() => { setActiveChatType("GROUP"); setActiveId(g.id); }}
                className={`w-full flex items-center gap-2.5 p-2 rounded-xl transition-all text-left ${activeChatType === "GROUP" && activeId === g.id ? 'bg-primary/15 text-primary shadow-xs border border-primary/20' : 'hover:bg-muted/50'}`}
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className={`font-semibold text-xs truncate ${activeChatType === "GROUP" && activeId === g.id ? 'text-primary' : ''}`}>{g.name}</h3>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-widest">{g.members?.length || 0} Members</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* DMs Section */}
        <div>
          <div className="px-2 mb-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Direct Messages ({filteredFriends.length})</span>
          </div>
          <div className="space-y-1">
            {filteredFriends.length === 0 ? (
              <p className="text-[11px] text-muted-foreground px-2 py-1">No friends found.</p>
            ) : (
              filteredFriends.map(f => (
                <button
                  key={f.friendshipId || f.user?.id}
                  onClick={() => { setActiveChatType("DM"); setActiveId(f.user?.id); }}
                  className={`w-full flex items-center gap-2.5 p-2 rounded-xl transition-all text-left ${activeChatType === "DM" && activeId === f.user?.id ? 'bg-primary/15 text-primary shadow-xs border border-primary/20' : 'hover:bg-muted/50'}`}
                >
                  <div className="w-8 h-8 rounded-full bg-muted overflow-hidden relative shrink-0 border border-border/50">
                    {f.user?.image ? (
                      <Image src={f.user.image} alt={f.user.username} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white bg-primary/30">
                        {f.user?.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h3 className={`font-semibold text-xs truncate ${activeChatType === "DM" && activeId === f.user?.id ? 'text-primary' : ''}`}>{f.user?.username}</h3>
                    <p className="text-[9px] text-green-500 uppercase flex items-center gap-1 font-mono"><Lock className="w-2.5 h-2.5" /> E2EE Secured</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );

  const renderSidebar = (isFeedMode: boolean) => (
    <div className={`flex flex-col ${isFeedMode ? 'w-72 xl:w-80 hidden lg:flex shrink-0 sticky top-20 bg-card/60 border border-border/50 rounded-2xl backdrop-blur-md shadow-sm max-h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar' : 'w-80 border-r border-border/50 bg-muted/10 flex flex-col hidden md:flex shrink-0'}`}>
      {renderSidebarContent()}
    </div>
  );

  // If in Feed mode, render the standard stream with unified sidebar & expanded feed viewing zone
  if (activeChatType === "FEED") {
    return (
      <div className="w-full flex items-start justify-center gap-6 relative">
        {renderSidebar(true)}
        <div className="flex-1 min-w-0 max-w-4xl 2xl:max-w-5xl">
          <TheFeed 
            onOpenMessages={() => { setActiveChatType("MESSAGES"); setActiveId(null); }}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            activeFeedTab={activeFeedTab}
            onFeedTabChange={setActiveFeedTab}
          />
        </div>
      </div>
    );
  }

  // Immersive Mobile Messages Directory / Hub (When on mobile and activeChatType is MESSAGES or no chat selected)
  if (activeChatType === "MESSAGES" || (!activeId && typeof window !== "undefined" && window.innerWidth < 768)) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-4 pb-20 animate-in fade-in duration-200">
        {/* Mobile Top Navigation Tabs: Feed vs Messages */}
        <div className="flex items-center p-1 bg-muted/40 rounded-xl border border-border/40 gap-1">
          <button
            onClick={() => { setActiveChatType("FEED"); setActiveId(null); }}
            className="flex-1 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center gap-1.5 transition-all"
          >
            <Compass className="w-4 h-4" />
            <span>The Feed</span>
          </button>
          <button
            className="flex-1 py-2 rounded-lg text-xs font-bold bg-primary text-primary-foreground shadow-sm flex items-center justify-center gap-1.5 transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Messages ({friends.length + groupChats.length})</span>
          </button>
        </div>

        {/* Mobile Messages Hub Card */}
        <div className="bg-card/90 border border-border/60 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl flex flex-col min-h-[75vh]">
          {renderSidebarContent()}
        </div>
      </div>
    );
  }

  // Active Chat Screen (DM or Group) on Mobile / Desktop
  return (
    <div className="flex h-[calc(100dvh-5.5rem)] md:h-[calc(100vh-8rem)] bg-card border border-border/50 rounded-2xl overflow-hidden shadow-2xl">
      {/* Desktop Left Sidebar */}
      {renderSidebar(false)}

      {/* Main Chat Conversation Stage */}
      <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
        {activeChatType === "DM" && (
          <div className="absolute top-0 left-0 w-full p-1 bg-green-500/10 border-b border-green-500/20 flex justify-center items-center gap-2 z-10">
            <Lock className="h-3.5 w-3.5 text-green-500" />
            <span className="text-[11px] font-semibold text-green-500 uppercase tracking-widest">End-to-End Encrypted Session</span>
          </div>
        )}
        {activeChatType === "GROUP" && (
          <div className="absolute top-0 left-0 w-full p-1 bg-muted border-b border-border/50 flex justify-center items-center gap-2 z-10">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Community Group Chat</span>
          </div>
        )}

        {/* Chat Stage Header */}
        <div className="p-3 sm:p-4 border-b border-border/50 flex items-center justify-between mt-7 bg-muted/10 shrink-0">
          <div className="flex items-center gap-3">
            {/* Back Button on Mobile */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden rounded-full h-8 w-8 hover:bg-muted"
              onClick={() => { setActiveChatType("MESSAGES"); setActiveId(null); }}
              title="Back to Messages"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            {activeChatType === "DM" && activeFriend ? (
              <>
                <div className="w-10 h-10 rounded-full bg-muted overflow-hidden relative border border-primary/40 shrink-0">
                  {activeFriend.image ? (
                    <Image src={activeFriend.image} alt={activeFriend.username} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white bg-primary/30">
                      {activeFriend.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base flex items-center gap-1.5">
                    @{activeFriend.username}
                  </h3>
                  <p className="text-[10px] text-green-500 flex items-center gap-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> E2EE Connected
                  </p>
                </div>
              </>
            ) : activeChatType === "GROUP" && activeGroup ? (
              <>
                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center relative font-bold shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">{activeGroup.name}</h3>
                  <p className="text-[10px] text-muted-foreground">{activeGroup.members?.length || 0} Members</p>
                </div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground">Select a conversation</div>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {activeChatType === "DM" ? (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-destructive rounded-full h-8 w-8" 
                onClick={handleClearHistory} 
                title="Clear conversation history"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            ) : activeChatType === "GROUP" ? (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-destructive rounded-full h-8 w-8" 
                onClick={() => { leaveGroupChat(activeId!); setActiveChatType("MESSAGES"); setActiveId(null); }} 
                title="Leave Group"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            ) : null}
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4" ref={scrollRef}>
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs text-center">
              {error}
            </div>
          )}
          
          {activeChatType === "DM" && !sharedKey && !error ? (
            <div className="flex flex-col items-center justify-center h-full opacity-60 text-center gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <p className="text-xs font-mono">Exchanging E2EE session keys...</p>
            </div>
          ) : messages.length === 0 && !error ? (
            <div className="flex flex-col items-center justify-center h-full opacity-60 text-center p-4">
              <div className="p-4 rounded-full bg-primary/10 text-primary mb-3">
                <MessageSquare className="w-8 h-8" />
              </div>
              <p className="font-bold text-sm">No messages yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                {activeChatType === "DM" 
                  ? `Messages with @${activeFriend?.username} are end-to-end encrypted.` 
                  : `Start the conversation in ${activeGroup?.name}.`}
              </p>
            </div>
          ) : (
            messages.map(msg => {
              const isSender = msg.isSender;
              return (
                <div key={msg.id} className={`flex flex-col ${isSender ? 'items-end' : 'items-start'} group relative`}>
                  {activeChatType === "GROUP" && !isSender && msg.sender && (
                    <span className="text-[10px] font-semibold text-muted-foreground mb-1 ml-1">@{msg.sender.username}</span>
                  )}
                  <div className="flex relative items-center gap-2 max-w-[85%] sm:max-w-[75%]">
                    <div 
                      className={`rounded-2xl px-4 py-2.5 shadow-sm text-sm leading-relaxed ${
                        isSender 
                          ? 'bg-primary text-primary-foreground rounded-br-sm' 
                          : 'bg-muted/80 text-foreground rounded-bl-sm border border-border/40'
                      }`}
                      style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
                    >
                      {msg.text || msg.body}
                    </div>
                    {activeChatType === "DM" && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity rounded-full ${isSender ? 'text-destructive' : 'text-destructive'}`}
                        onClick={() => handleDeleteMessage(msg.id)}
                        title="Delete message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                  {isSender && activeChatType === "DM" && msg.isRead && (
                    <span className="text-[9px] text-muted-foreground mt-1 mr-1 flex items-center gap-1">
                      Read <Check className="w-2.5 h-2.5 text-primary" />
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Message Input Bar */}
        <div className="p-3 sm:p-4 border-t border-border/50 bg-muted/10 shrink-0">
          <div className="max-w-4xl mx-auto flex gap-2.5 items-end">
            <Textarea 
              placeholder={activeChatType === "DM" ? "Type encrypted message..." : "Type a message..."}
              className="resize-none min-h-[44px] max-h-[140px] rounded-2xl flex-1 text-sm focus-visible:ring-1 bg-background py-2.5 px-3.5"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending || (activeChatType === "DM" && !sharedKey)}
              spellCheck={true}
              rows={1}
            />
            <Button 
              onClick={() => handleSend()} 
              disabled={isSending || !inputText.trim() || (activeChatType === "DM" && !sharedKey)}
              className="h-[44px] w-[44px] rounded-2xl shrink-0 p-0"
              title="Send Message"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

