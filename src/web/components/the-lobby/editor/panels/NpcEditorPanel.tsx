'use client';

import React, { useState } from 'react';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import { UserPlus, Save } from 'lucide-react';

export const NpcEditorPanel: React.FC = () => {
  const showToast = useGameStore((state) => state.showToast);
  
  const [npcName, setNpcName] = useState('Keeper Alex');
  const [npcSprite, setNpcSprite] = useState('/game-assets/npc/heroine.png');
  const [npcDialogue, setNpcDialogue] = useState('Welcome to the animist grounds, Tamer!');
  
  const clickedTile = useEditorStore((state) => state.clickedTile);
  const [spawnX, setSpawnX] = useState(10);
  const [spawnY, setSpawnY] = useState(10);

  React.useEffect(() => {
    if (clickedTile) {
      setSpawnX(clickedTile.c);
      setSpawnY(clickedTile.r);
    }
  }, [clickedTile]);

  const handleAddNpc = () => {
    // In a real implementation this would emit to the server, but for now we'll just show a toast
    showToast(`Placed ${npcName} at (${spawnX}, ${spawnY})`);
  };

  return (
    <div className="space-y-4 text-xs font-mono">
      <div className="bg-[#0b1320]/60 border border-[#806f47]/30 rounded p-2 space-y-2">
        <div className="flex items-center gap-1.5 font-bold text-[#cbb26a] border-b border-[#806f47]/30 pb-1">
          <UserPlus className="w-3.5 h-3.5" /> Place NPC
        </div>
        
        <div className="space-y-2">
          <input type="text" value={npcName} onChange={(e) => setNpcName(e.target.value)} placeholder="NPC Name" className="w-full bg-[#050b14] border border-slate-700 rounded px-2 py-1" />
          <input type="text" value={npcSprite} onChange={(e) => setNpcSprite(e.target.value)} placeholder="Sprite URL" className="w-full bg-[#050b14] border border-slate-700 rounded px-2 py-1" />
          <textarea value={npcDialogue} onChange={(e) => setNpcDialogue(e.target.value)} placeholder="Dialogue ID or Text" className="w-full bg-[#050b14] border border-slate-700 rounded px-2 py-1 h-20 resize-none custom-scrollbar" />
          
          <div className="flex gap-2">
            <div>
              <label className="block text-[10px] text-slate-400">X</label>
              <input type="number" value={spawnX} onChange={(e) => setSpawnX(parseInt(e.target.value))} className="w-full bg-[#050b14] border border-slate-700 rounded px-2 py-1" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400">Y</label>
              <input type="number" value={spawnY} onChange={(e) => setSpawnY(parseInt(e.target.value))} className="w-full bg-[#050b14] border border-slate-700 rounded px-2 py-1" />
            </div>
          </div>
          
          <button onClick={handleAddNpc} className="w-full py-1.5 bg-[#806f47]/80 hover:bg-[#806f47] text-white rounded font-bold flex items-center justify-center gap-1">
            <Save className="w-3.5 h-3.5" /> Drop NPC in World
          </button>
        </div>
      </div>
    </div>
  );
};
