"use client";

import { useState, useEffect, useRef } from "react";
import { 
  getFriendsList, getMessages, sendMessage, getPublicKey, 
  deleteMessage, clearChatHistory, createGroupChat, getGroupChats, 
  getGroupMessages, sendGroupMessage, leaveGroupChat
} from "@/app/actions/messenger";
import { importPrivateKey, importPublicKey, deriveSharedKey, encryptMessage, decryptMessage, getLocalPrivateKey } from "@/lib/crypto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Lock, Loader2, Trash2, Search, Compass, Users, Plus, Check } from "lucide-react";
import Image from "next/image";
import { TheFeed } from "./the-feed";

type ChatType = "FEED" | "DM" | "GROUP";

export function InboxClient() {
  const [activeChatType, setActiveChatType] = useState<ChatType>("FEED");
  const [activeId, setActiveId] = useState<string | null>(null);

  const [friends, setFriends] = useState<any[]>([]);
  const [groupChats, setGroupChats] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
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
      setFriends(data.friends);
      const groups = await getGroupChats();
      setGroupChats(groups);
    }
    loadData();
  }, []);

  const activeFriend = activeChatType === "DM" ? friends.find(f => f.user.id === activeId)?.user : null;
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

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-card border border-border/50 rounded-xl overflow-hidden shadow-2xl">
      {/* Sidebar */}
      <div className="w-80 border-r border-border/50 bg-muted/10 flex flex-col hidden md:flex shrink-0">
        <div className="p-4 border-b border-border/50">
          <h2 className="font-bold text-xl mb-4">Inbox</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 bg-background" placeholder="Search..." />
          </div>
        </div>
        
        {/* The Feed Button */}
        <div className="p-2 border-b border-border/50">
          <button
            onClick={() => { setActiveChatType("FEED"); setActiveId(null); }}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${activeChatType === "FEED" ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'}`}
          >
            <Compass className="w-5 h-5 shrink-0" />
            <span className="font-bold">The Feed</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {/* Groups Section */}
          <div>
            <div className="flex items-center justify-between px-2 mb-2 mt-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Group Chats</span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setIsCreatingGroup(!isCreatingGroup)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {isCreatingGroup && (
              <div className="p-3 bg-background rounded-lg border border-border mb-2 space-y-3 shadow-md">
                <Input placeholder="Group Name" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} className="h-8 text-sm" />
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {friends.map(f => (
                    <div key={f.user.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded transition-colors" onClick={() => {
                      if (selectedFriends.includes(f.user.id)) setSelectedFriends(prev => prev.filter(id => id !== f.user.id));
                      else setSelectedFriends(prev => [...prev, f.user.id]);
                    }}>
                      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${selectedFriends.includes(f.user.id) ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>
                        {selectedFriends.includes(f.user.id) && <Check className="w-3 h-3" />}
                      </div>
                      <span className="text-sm font-medium truncate">{f.user.username}</span>
                    </div>
                  ))}
                </div>
                <Button size="sm" className="w-full h-8" onClick={handleCreateGroup} disabled={!newGroupName || selectedFriends.length === 0}>Create</Button>
              </div>
            )}
            <div className="space-y-1">
              {groupChats.length === 0 && !isCreatingGroup && <p className="text-xs text-muted-foreground px-2">No groups yet.</p>}
              {groupChats.map(g => (
                <button
                  key={g.id}
                  onClick={() => { setActiveChatType("GROUP"); setActiveId(g.id); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${activeChatType === "GROUP" && activeId === g.id ? 'bg-primary/10 hover:bg-primary/20' : 'hover:bg-muted/50'}`}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex flex-col items-center justify-center relative shrink-0 font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h3 className={`font-semibold truncate ${activeChatType === "GROUP" && activeId === g.id ? 'text-primary' : ''}`}>{g.name}</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Standard Chat</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* DMs Section */}
          <div>
            <div className="px-2 mb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Direct Messages</span>
            </div>
            <div className="space-y-1">
              {friends.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2">No friends added yet.</p>
              ) : (
                friends.map(f => (
                  <button
                    key={f.friendshipId}
                    onClick={() => { setActiveChatType("DM"); setActiveId(f.user.id); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${activeChatType === "DM" && activeId === f.user.id ? 'bg-primary/10 hover:bg-primary/20' : 'hover:bg-muted/50'}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-muted overflow-hidden relative shrink-0">
                      {f.user.image && <Image src={f.user.image} alt={f.user.username} fill className="object-cover" />}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h3 className={`font-semibold truncate ${activeChatType === "DM" && activeId === f.user.id ? 'text-primary' : ''}`}>{f.user.username}</h3>
                      <p className="text-[10px] text-green-500 uppercase flex items-center gap-1"><Lock className="w-3 h-3" /> E2EE Secured</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
        {activeChatType === "FEED" ? (
          <TheFeed />
        ) : (
          <>
            {activeChatType === "DM" && (
              <div className="absolute top-0 left-0 w-full p-1 bg-green-500/10 border-b border-green-500/20 flex justify-center items-center gap-2 z-10">
                <Lock className="h-4 w-4 text-green-500" />
                <span className="text-xs font-semibold text-green-500 uppercase tracking-widest">End-to-End Encrypted Session</span>
              </div>
            )}
            {activeChatType === "GROUP" && (
              <div className="absolute top-0 left-0 w-full p-1 bg-muted border-b border-border/50 flex justify-center items-center gap-2 z-10">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Standard Group Chat (Unencrypted)</span>
              </div>
            )}

            <div className="p-4 border-b border-border/50 flex items-center justify-between mt-8 bg-muted/5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="md:hidden">
                  <Button variant="ghost" size="icon" onClick={() => { setActiveChatType("FEED"); setActiveId(null); }}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </div>
                
                {activeChatType === "DM" && activeFriend ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-muted overflow-hidden relative">
                      {activeFriend.image && <Image src={activeFriend.image} alt={activeFriend.username} fill className="object-cover" />}
                    </div>
                    <div>
                      <h3 className="font-bold">{activeFriend.username}</h3>
                      <p className="text-xs text-green-500">Connected</p>
                    </div>
                  </>
                ) : activeChatType === "GROUP" && activeGroup ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center relative font-bold">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold">{activeGroup.name}</h3>
                      <p className="text-xs text-muted-foreground">{activeGroup.members?.length || 0} Members</p>
                    </div>
                  </>
                ) : null}
              </div>
              
              {activeChatType === "DM" ? (
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={handleClearHistory} title="Delete entire conversation">
                  <Trash2 className="w-5 h-5" />
                </Button>
              ) : activeChatType === "GROUP" ? (
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => { leaveGroupChat(activeId!); setActiveChatType("FEED"); }} title="Leave Group">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              ) : null}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
              {error && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm text-center">
                  {error}
                </div>
              )}
              
              {activeChatType === "DM" && !sharedKey && !error ? (
                <div className="flex flex-col items-center justify-center h-full opacity-50">
                  <Loader2 className="w-8 h-8 animate-spin mb-4" />
                  <p>Exchanging keys...</p>
                </div>
              ) : messages.length === 0 && !error ? (
                <div className="flex flex-col items-center justify-center h-full opacity-50 text-center">
                  <p>No messages here yet.</p>
                  <p className="text-xs mt-2">
                    {activeChatType === "DM" 
                      ? `Only you and ${activeFriend?.username} can read this conversation.` 
                      : `Start chatting in ${activeGroup?.name}.`}
                  </p>
                </div>
              ) : (
                messages.map(msg => {
                  const isSender = msg.isSender;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isSender ? 'items-end' : 'items-start'} group relative`}>
                      {activeChatType === "GROUP" && !isSender && msg.sender && (
                        <span className="text-[10px] font-semibold text-muted-foreground mb-1 ml-1">{msg.sender.username}</span>
                      )}
                      <div className="flex relative items-center gap-2">
                        <div 
                          className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-sm text-base leading-relaxed ${
                            isSender 
                              ? 'bg-primary text-primary-foreground rounded-br-sm' 
                              : 'bg-muted text-foreground rounded-bl-sm'
                          }`}
                          style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
                        >
                          {msg.text || msg.body}
                        </div>
                        {activeChatType === "DM" && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity ${isSender ? '-left-12 text-destructive' : '-right-12 text-destructive'}`}
                            onClick={() => handleDeleteMessage(msg.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {isSender && activeChatType === "DM" && msg.isRead && (
                        <span className="text-[10px] text-muted-foreground mt-1 mr-1 flex items-center gap-1">
                          Read <Check className="w-3 h-3 text-primary" />
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-border/50 bg-muted/10 shrink-0">
              <div className="max-w-4xl mx-auto flex gap-4 items-end">
                <Textarea 
                  placeholder={activeChatType === "DM" ? "Write a secure message..." : "Write a message..."}
                  className="resize-none min-h-[60px] max-h-[200px] rounded-xl flex-1 text-base focus-visible:ring-1 bg-background"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSending || (activeChatType === "DM" && !sharedKey)}
                  spellCheck={true}
                />
                <Button 
                  onClick={() => handleSend()} 
                  disabled={isSending || !inputText.trim() || (activeChatType === "DM" && !sharedKey)}
                  className="h-[60px] w-[60px] rounded-xl shrink-0"
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>
              <div className="text-center mt-2 text-[10px] text-muted-foreground uppercase tracking-wider">
                Press Shift + Enter for new line. Enter to send.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
