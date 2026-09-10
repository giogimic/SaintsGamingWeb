import React, { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../state/useChatStore';
import { socketManager } from '../net/SocketManager';
import { inputManager } from '../input/InputManager';

export function ChatOverlay() {
  const messages = useChatStore((s: any) => s.messages);
  const [inputText, setInputText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (inputText.startsWith('/')) {
      // Command
      socketManager.emit('input', { type: 'MOVE', direction: 'down', sequence: Date.now(), timestamp: Date.now() }); // Hack: fix later
    } else {
      socketManager.emit('chat_message', { message: inputText });
    }
    
    setInputText('');
  };

  return (
    <div 
      className={`absolute bottom-4 left-4 w-80 max-w-[90vw] flex flex-col gap-2 z-[9000] transition-opacity duration-200 ${isFocused ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
      onMouseEnter={() => inputManager.detach()}
      onMouseLeave={() => inputManager.attach(document.getElementById('game-canvas') as HTMLCanvasElement)}
    >
      <div 
        ref={scrollRef}
        className="h-48 overflow-y-auto flex flex-col gap-1 pr-2 custom-scrollbar mask-image-to-top"
        style={{ WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%)' }}
      >
        <div className="flex-1" />
        {messages.map((m: any) => (
          <div key={m.id} className="text-sm">
            {m.channel === 'SYSTEM' ? (
              <span className="text-yellow-400 font-bold">[{m.sender}] {m.text}</span>
            ) : m.channel === 'GLOBAL' ? (
              <span className="text-white"><span className="text-orange-400 font-bold">[{m.sender}]</span>: {m.text}</span>
            ) : (
              <span className="text-white"><span className="text-blue-300 font-bold">{m.sender}</span>: {m.text}</span>
            )}
          </div>
        ))}
      </div>
      
      <form onSubmit={handleSubmit} className="relative">
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Press Enter to chat..."
          className="w-full bg-black/60 border border-white/20 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary backdrop-blur-md pointer-events-auto"
        />
      </form>
    </div>
  );
}
