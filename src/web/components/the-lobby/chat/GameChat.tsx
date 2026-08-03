'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store';
import { FriendsList } from '@/web/components/messenger/friends-list';
import { ChatWindow } from '@/web/components/messenger/chat-window';
import { useMessenger } from '@/web/components/messenger/messenger-provider';
import { useAuth } from '@/shared/hooks/use-auth';

type TabType = 'LOCAL' | 'GLOBAL' | 'PARTY' | 'FRIENDS';

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  type: 'LOCAL' | 'GLOBAL' | 'PARTY' | 'SYSTEM';
}

function FriendsWrapper() {
  const { activeChat } = useMessenger();
  return activeChat ? (
    <div className="h-full bg-lobby-bg/95"><ChatWindow /></div>
  ) : (
    <div className="h-full bg-lobby-bg/95"><FriendsList /></div>
  );
}

function msgClass(type: ChatMessage['type']) {
  switch (type) {
    case 'PARTY':
      return 'lobby-chat-msg-party';
    case 'GLOBAL':
      return 'lobby-chat-msg-global';
    case 'SYSTEM':
      return 'lobby-chat-msg-system';
    default:
      return 'lobby-chat-msg-local';
  }
}

export function GameChat() {
  const [activeTab, setActiveTab] = useState<TabType>('LOCAL');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showEmotes, setShowEmotes] = useState(false);
  /** Collapsed by default on narrow viewports so touch controls stay clear. */
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const emitSocketEvent = useGameStore((state) => state.emitSocketEvent);
  const player = useGameStore((state) => state.player);
  const { isModerator } = useAuth();

  useEffect(() => {
    const handleNewMessage = (e: CustomEvent<ChatMessage>) => {
      setMessages((prev) => [...prev, e.detail].slice(-100));
    };

    window.addEventListener('game_chat_msg' as any, handleNewMessage);
    return () => window.removeEventListener('game_chat_msg' as any, handleNewMessage);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  const handleSend = () => {
    const text = chatInput.trim();
    if (!text) return;

    if (text.startsWith('/p join ')) {
      const leaderName = text.replace('/p join ', '').trim();
      emitSocketEvent?.('party_join', leaderName);
      setChatInput('');
      return;
    }
    if (text === '/p leave') {
      emitSocketEvent?.('party_leave', {});
      setChatInput('');
      return;
    }
    if (isModerator && text.startsWith('/announce ')) {
      const msg = text.replace('/announce ', '').trim();
      if (msg) emitSocketEvent?.('staff_announce', msg);
      setChatInput('');
      return;
    }

    if (activeTab === 'LOCAL') {
      emitSocketEvent?.('chat_message', text);
      useGameStore.getState().setPlayerChat(text);
      setMessages((prev) =>
        [
          ...prev,
          {
            id: Date.now().toString(),
            sender: player.name || 'You',
            text,
            timestamp: Date.now(),
            type: 'LOCAL' as const,
          },
        ].slice(-100)
      );
    } else if (activeTab === 'GLOBAL') {
      emitSocketEvent?.('global_chat', text);
      setMessages((prev) =>
        [
          ...prev,
          {
            id: Date.now().toString(),
            sender: player.name || 'You',
            text,
            timestamp: Date.now(),
            type: 'GLOBAL' as const,
          },
        ].slice(-100)
      );
    } else if (activeTab === 'PARTY') {
      emitSocketEvent?.('party_chat', text);
      setMessages((prev) =>
        [
          ...prev,
          {
            id: Date.now().toString(),
            sender: player.name || 'You',
            text,
            timestamp: Date.now(),
            type: 'PARTY' as const,
          },
        ].slice(-100)
      );
    }

    setChatInput('');
    setShowEmotes(false);
  };

  const handleEmoteClick = (emote: string) => {
    setChatInput((prev) => prev + emote);
    setShowEmotes(false);
  };

  const filteredMessages = messages.filter(
    (m) =>
      activeTab === 'LOCAL'
        ? m.type === 'LOCAL' || m.type === 'SYSTEM'
        : m.type === activeTab
  );

  const tabs: { id: TabType; label: string }[] = [
    { id: 'LOCAL', label: 'Local' },
    { id: 'GLOBAL', label: 'Global' },
    { id: 'PARTY', label: 'Party' },
    { id: 'FRIENDS', label: 'Friends' },
  ];

  const latest = messages[messages.length - 1];

  return (
    <div
      className={`lobby-panel pointer-events-auto z-50 flex flex-col overflow-hidden rounded-lg max-md:fixed max-md:left-2 max-md:right-auto md:relative md:h-[210px] md:w-[480px] ${
        mobileExpanded
          ? 'max-md:bottom-[calc(7.5rem+env(safe-area-inset-bottom))] max-md:h-[38vh] max-md:w-[min(92vw,22rem)]'
          : 'max-md:bottom-[calc(7.5rem+env(safe-area-inset-bottom))] max-md:h-auto max-md:w-[min(70vw,14rem)]'
      }`}
      style={{
        // Desktop DraggablePanel positions this; mobile uses fixed + safe area above.
      }}
    >
      <button
        type="button"
        onClick={() => setMobileExpanded((v) => !v)}
        className="lobby-panel-header flex w-full items-center justify-between px-2.5 py-1.5 text-left md:pointer-events-none md:cursor-default md:px-3"
      >
        <div className="flex min-w-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-lobby-fog">
          <Radio className="h-3.5 w-3.5 shrink-0 text-lobby-soul" />
          <span className="truncate">Soul Channel</span>
        </div>
        <div className="mx-2 hidden h-px flex-1 lobby-hairline opacity-70 md:block" />
        <span className="shrink-0 text-[10px] font-mono text-lobby-film md:hidden">
          {mobileExpanded ? 'Hide' : 'Open'}
        </span>
      </button>

      {!mobileExpanded && (
        <div className="truncate px-2.5 pb-1.5 text-[11px] text-lobby-ash md:hidden">
          {latest ? (
            <span>
              <span className="font-semibold text-lobby-mist/80">{latest.sender}: </span>
              {latest.text}
            </span>
          ) : (
            <span className="italic">Tap to open chat</span>
          )}
        </div>
      )}

      <div className={`${mobileExpanded ? 'flex' : 'hidden'} min-h-0 flex-1 flex-col md:flex`}>

      <div className="relative m-1.5 flex-1 overflow-hidden rounded-md border border-lobby-border bg-black/35">
        {activeTab === 'FRIENDS' ? (
          <FriendsWrapper />
        ) : (
          <div
            ref={scrollRef}
            className="h-full w-full space-y-1 overflow-y-auto p-2.5 scrollbar-thin scrollbar-thumb-lobby-ash/40 scrollbar-track-transparent"
          >
            {filteredMessages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-xs italic text-lobby-ash">
                <span>No exposures on this channel yet.</span>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                
                // Color coding based on channel (RS style)
                let prefix = '';
                let textStyle = { color: 'black', textShadow: 'none' };
                let senderStyle = { color: 'black' };
                
                if (msg.type === 'PARTY') {
                  prefix = '[Clan] ';
                  textStyle = { color: '#7e22ce', textShadow: '1px 1px 0px rgba(255,255,255,0.3)' };
                  senderStyle = { color: '#000000' };
                } else if (msg.type === 'GLOBAL') {
                  prefix = '[Global] ';
                  textStyle = { color: '#0284c7', textShadow: '1px 1px 0px rgba(255,255,255,0.3)' };
                  senderStyle = { color: '#000000' };
                } else if (msg.type === 'SYSTEM') {
                  prefix = '';
                  textStyle = { color: '#9a3412', textShadow: '1px 1px 0px rgba(255,255,255,0.3)' };
                  senderStyle = { color: '#9a3412' };
                } else {
                  textStyle = { color: '#0000ff', textShadow: '1px 1px 0px rgba(255,255,255,0.3)' };
                  senderStyle = { color: '#000000' };
                }

                return (
                  <div key={msg.id} className={`flex text-[13px] leading-snug ${msgClass(msg.type)}`}>
                    <span className="mr-1.5 shrink-0 font-semibold text-lobby-mist/90">
                      {prefix}
                      {msg.sender}:
                    </span>
                    <span className="break-words">{msg.text}</span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {showEmotes && activeTab !== 'FRIENDS' && (
        <div className="lobby-panel absolute bottom-16 left-2 z-50 flex gap-1.5 rounded-md p-2 text-lg">
          {['👋', '⚔️', '🔥', '🏆', 'GG', '❤️', '👀', '🎉'].map((e) => (
            <button
              key={e}
              onClick={() => handleEmoteClick(e)}
              className="rounded-sm p-1 transition-colors hover:bg-lobby-soul/20"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {activeTab !== 'FRIENDS' && (
        <div className="flex items-center gap-2 border-t border-lobby-border px-2.5 py-1.5">
          <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-lobby-film">
            {player.name || 'You'}
          </span>
          <input
            type="text"
            placeholder="Speak into the lens…"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            className="h-7 flex-1 rounded-sm border border-lobby-border bg-black/40 px-2 text-[13px] text-lobby-mist outline-none placeholder:text-lobby-ash focus:border-lobby-soul/50"
          />
          <button
            type="button"
            onClick={() => setShowEmotes((v) => !v)}
            className="rounded-sm border border-lobby-border px-1.5 py-0.5 text-sm text-lobby-fog hover:border-lobby-film/40 hover:text-lobby-mist"
            title="Emotes"
          >
            ✦
          </button>
        </div>
      )}

      <div className="flex gap-1 border-t border-lobby-border bg-black/25 px-1.5 py-1">
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 rounded-sm py-1 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                isActive
                  ? 'bg-lobby-soul/25 text-lobby-mist border border-lobby-soul/40'
                  : 'text-lobby-ash hover:bg-white/5 hover:text-lobby-fog border border-transparent'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}
