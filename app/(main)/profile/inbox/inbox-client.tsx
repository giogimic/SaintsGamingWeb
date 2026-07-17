"use client";

import { useState, useEffect, useRef } from "react";
import { getFriendsList, getMessages, sendMessage, getPublicKey, deleteMessage, clearChatHistory } from "@/app/actions/messenger";
import { importPrivateKey, importPublicKey, deriveSharedKey, encryptMessage, decryptMessage, getLocalPrivateKey } from "@/lib/crypto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Lock, Loader2, Trash2, Search, Compass } from "lucide-react";
import Image from "next/image";
import { TheFeed } from "./the-feed";

export function InboxClient() {
  const [friends, setFriends] = useState<any[]>([]);
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [sharedKey, setSharedKey] = useState<CryptoKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load friends
  useEffect(() => {
    async function loadFriends() {
      const data = await getFriendsList();
      setFriends(data.friends);
    }
    loadFriends();
  }, []);

  const activeFriend = friends.find(f => f.user.id === activeFriendId)?.user;

  // Setup Keys
  useEffect(() => {
    async function setupKeys() {
      if (!activeFriendId) return;
      setError(null);
      setSharedKey(null);
      setMessages([]);
      
      try {
        const pkBase64 = getLocalPrivateKey();
        if (!pkBase64) throw new Error("Device not linked for E2EE.");
        
        const myPrivKey = await importPrivateKey(pkBase64);
        const friendPkBase64 = await getPublicKey(activeFriendId);
        
        if (!friendPkBase64) throw new Error("Friend has not setup E2EE yet.");
        const friendPubKey = await importPublicKey(friendPkBase64);
        
        const key = await deriveSharedKey(myPrivKey, friendPubKey);
        setSharedKey(key);
      } catch (err: any) {
        setError(err.message || "Key exchange failed.");
      }
    }
    setupKeys();
  }, [activeFriendId]);

  // Fetch Messages
  async function fetchMessages() {
    if (!activeFriendId || !sharedKey) return;
    try {
      const encryptedMsgs = await getMessages(activeFriendId);
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
  }

  // Polling
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedKey, activeFriendId]);

  // Scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!inputText.trim() || !sharedKey || !activeFriendId) return;

    const textToSend = inputText;
    setInputText("");
    setIsSending(true);

    try {
      const { ciphertext, iv } = await encryptMessage(sharedKey, textToSend);
      await sendMessage(activeFriendId, ciphertext, iv, ciphertext, iv);
      await fetchMessages();
    } catch (err) {
      console.error(err);
      setError("Failed to send message");
    } finally {
      setIsSending(false);
    }
  }

  async function handleDeleteMessage(id: string) {
    try {
      await deleteMessage(id);
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  async function handleClearHistory() {
    if (!activeFriendId) return;
    try {
      await clearChatHistory(activeFriendId);
      setMessages([]);
    } catch (e) {
      console.error(e);
    }
  }

  // Keyboard shortcut for enter to send
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
            <Input className="pl-9 bg-background" placeholder="Search friends..." />
          </div>
        </div>
        
        {/* The Feed Button */}
        <div className="p-2 border-b border-border/50">
          <button
            onClick={() => setActiveFriendId(null)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${!activeFriendId ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'}`}
          >
            <Compass className="w-5 h-5 shrink-0" />
            <span className="font-bold">The Feed</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {friends.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm p-4">No friends added yet.</p>
          ) : (
            friends.map(f => (
              <button
                key={f.friendshipId}
                onClick={() => setActiveFriendId(f.user.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${activeFriendId === f.user.id ? 'bg-primary/10 hover:bg-primary/20' : 'hover:bg-muted/50'}`}
              >
                <div className="w-10 h-10 rounded-full bg-muted overflow-hidden relative shrink-0">
                  {f.user.image && <Image src={f.user.image} alt={f.user.username} fill className="object-cover" />}
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className={`font-semibold truncate ${activeFriendId === f.user.id ? 'text-primary' : ''}`}>{f.user.username}</h3>
                  <p className="text-xs text-muted-foreground truncate">E2EE Secured</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
        {!activeFriendId ? (
          <TheFeed />
        ) : (
          <>
            <div className="absolute top-0 left-0 w-full p-1 bg-green-500/10 border-b border-green-500/20 flex justify-center items-center gap-2 z-10">
              <Lock className="h-4 w-4 text-green-500" />
              <span className="text-xs font-semibold text-green-500 uppercase tracking-widest">End-to-End Encrypted Session</span>
            </div>

            <div className="p-4 border-b border-border/50 flex items-center justify-between mt-8 bg-muted/5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="md:hidden">
                  <Button variant="ghost" size="icon" onClick={() => setActiveFriendId(null)}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </div>
                <div className="w-10 h-10 rounded-full bg-muted overflow-hidden relative">
                  {activeFriend?.image && <Image src={activeFriend.image} alt={activeFriend.username} fill className="object-cover" />}
                </div>
                <div>
                  <h3 className="font-bold">{activeFriend?.username}</h3>
                  <p className="text-xs text-green-500">Connected</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={handleClearHistory} title="Delete entire conversation">
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
              {error && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm text-center">
                  {error}
                </div>
              )}
              
              {!sharedKey && !error ? (
                <div className="flex flex-col items-center justify-center h-full opacity-50">
                  <Loader2 className="w-8 h-8 animate-spin mb-4" />
                  <p>Exchanging keys...</p>
                </div>
              ) : messages.length === 0 && !error ? (
                <div className="flex flex-col items-center justify-center h-full opacity-50 text-center">
                  <p>No messages here yet.</p>
                  <p className="text-xs mt-2">Only you and {activeFriend?.username} can read this conversation.</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.isSender ? 'justify-end' : 'justify-start'} group relative`}>
                    <div 
                      className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-sm text-base leading-relaxed ${
                        msg.isSender 
                          ? 'bg-primary text-primary-foreground rounded-br-sm' 
                          : 'bg-muted text-foreground rounded-bl-sm'
                      }`}
                      style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
                    >
                      {msg.text}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity ${msg.isSender ? '-left-12 text-destructive' : '-right-12 text-destructive'}`}
                      onClick={() => handleDeleteMessage(msg.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-border/50 bg-muted/10 shrink-0">
              <div className="max-w-4xl mx-auto flex gap-4 items-end">
                <Textarea 
                  placeholder="Write a secure message..." 
                  className="resize-none min-h-[60px] max-h-[200px] rounded-xl flex-1 text-base focus-visible:ring-1"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSending || !sharedKey}
                  spellCheck={true}
                />
                <Button 
                  onClick={() => handleSend()} 
                  disabled={isSending || !inputText.trim() || !sharedKey}
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
