"use client";

import { useState, useEffect, useRef } from "react";
import { useMessenger } from "./messenger-provider";
import { getMessages, sendMessage, getPublicKey } from "@/app/actions/messenger";
import { importPrivateKey, importPublicKey, deriveSharedKey, encryptMessage, decryptMessage, getLocalPrivateKey } from "@/lib/crypto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Lock, Loader2 } from "lucide-react";

export function ChatWindow() {
  const { activeChat, setActiveChat } = useMessenger();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [sharedKey, setSharedKey] = useState<CryptoKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize E2EE for this specific chat
  useEffect(() => {
    async function setupKeys() {
      if (!activeChat) return;
      setError(null);
      try {
        const pkBase64 = getLocalPrivateKey();
        if (!pkBase64) throw new Error("Missing local private key");
        
        const myPrivKey = await importPrivateKey(pkBase64);
        
        const friendPkBase64 = await getPublicKey(activeChat.id);
        if (!friendPkBase64) throw new Error("Friend has not setup E2EE yet");

        const friendPubKey = await importPublicKey(friendPkBase64);
        
        const key = await deriveSharedKey(myPrivKey, friendPubKey);
        setSharedKey(key);
      } catch (err: any) {
        setError(err.message || "Failed to establish secure connection.");
      }
    }
    setupKeys();
  }, [activeChat]);

  // Fetch and decrypt messages
  async function fetchMessages() {
    if (!activeChat || !sharedKey) return;
    try {
      const encryptedMsgs = await getMessages(activeChat.id);
      
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
      
      // Only update if length changed or new messages added to avoid flicker
      setMessages(prev => {
        if (prev.length !== decrypted.length) return decrypted;
        // Simple comparison of last message ID
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
  }, [sharedKey, activeChat]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!inputText.trim() || !sharedKey || !activeChat) return;

    const textToSend = inputText;
    setInputText("");
    setIsSending(true);

    try {
      // Because ECDH yields the same symmetric key for both parties,
      // we can encrypt once, and both sender and receiver can decrypt it.
      const { ciphertext, iv } = await encryptMessage(sharedKey, textToSend);
      
      await sendMessage(activeChat.id, ciphertext, iv, ciphertext, iv);
      await fetchMessages();
    } catch (err) {
      console.error(err);
      setError("Failed to send message");
    } finally {
      setIsSending(false);
    }
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="p-3 border-b border-border/50 flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setActiveChat(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm">Error</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <Lock className="h-8 w-8 text-destructive mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setActiveChat(null)}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (!sharedKey) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50 mb-2" />
        <p className="text-xs text-muted-foreground">Securing connection...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background relative">
      <div className="absolute top-0 left-0 w-full p-1 bg-green-500/10 border-b border-green-500/20 flex justify-center items-center gap-1 z-10">
        <Lock className="h-3 w-3 text-green-500" />
        <span className="text-[10px] font-medium text-green-500 uppercase tracking-widest">End-to-End Encrypted</span>
      </div>

      <div className="p-2 border-b border-border/50 flex items-center gap-2 mt-6 bg-muted/20">
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setActiveChat(null)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground">Chatting with {activeChat?.username}</span>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center opacity-50">
            <p className="text-xs">No messages yet.<br/>Say hello!</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.isSender ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  msg.isSender 
                    ? 'bg-primary text-primary-foreground rounded-br-sm' 
                    : 'bg-muted text-foreground rounded-bl-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-border/50 flex gap-2 bg-background">
        <Input 
          placeholder="Encrypted message..." 
          className="flex-1 h-9 rounded-full px-4 bg-muted/50 focus-visible:ring-1"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isSending}
        />
        <Button type="submit" size="icon" className="h-9 w-9 rounded-full shrink-0" disabled={isSending || !inputText.trim()}>
          <Send className="h-4 w-4 ml-0.5" />
        </Button>
      </form>
    </div>
  );
}
