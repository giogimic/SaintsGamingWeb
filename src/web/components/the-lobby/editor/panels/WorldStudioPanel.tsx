import React from 'react';
import { useEditorStore } from '../editor-store';
import { DraggablePanel } from './DraggablePanel';
import {
  Users, PawPrint, Package, Coins, Sparkles, ScrollText, MessageSquare, MapPin, Sword, Shield, Store, Globe
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

export function WorldStudioPanel() {
  const panel = useEditorStore((s) => s.panels.worldStudio);
  const openPanel = useEditorStore((s) => s.openPanel);
  if (!panel?.isOpen) return null;

  const categories = [
    {
      title: 'Characters & Entities',
      items: [
        { id: 'npc', label: 'NPC Studio', icon: Users, desc: 'Create non-player characters and vendors' },
        { id: 'creature', label: 'Creature Studio', icon: PawPrint, desc: 'Author creatures and catalogs' },
        { id: 'hero', label: 'Hero Studio', icon: Users, desc: 'Manage player hero identities', mode: 'hero' },
      ]
    },
    {
      title: 'World Content',
      items: [
        { id: 'quest', label: 'Quest Studio', icon: ScrollText, desc: 'Author quests and dialogue triggers' },
        { id: 'dialogue', label: 'Dialogue Editor', icon: MessageSquare, desc: 'Create dialogue trees' },
        { id: 'items', label: 'Item Studio', icon: Package, desc: 'Manage items and equipment' },
        { id: 'loot', label: 'Loot Manager', icon: Coins, desc: 'Configure loot tables and drops' },
        { id: 'shop', label: 'Shop Studio', icon: Store, desc: 'Configure vendor inventories' },
      ]
    },
    {
      title: 'Encounters & Events',
      items: [
        { id: 'spawner', label: 'Monster Spawner', icon: Sword, desc: 'Configure enemy spawn points' },
        { id: 'spawnEditor', label: 'Spawn Editor', icon: MapPin, desc: 'Global player spawn coordinates' },
        { id: 'dungeons', label: 'Dungeon Studio', icon: Shield, desc: 'Create auto-generating dungeons' },
        { id: 'worldevent', label: 'World Events', icon: Sparkles, desc: 'Configure dynamic world events' },
        { id: 'mounts', label: 'Mount Studio', icon: PawPrint, desc: 'Configure rideable mounts' },
      ]
    }
  ];

  return (
    <DraggablePanel id="worldStudio" minWidth={340} minHeight={480}>
      <div className="flex flex-col h-full bg-[#050b14]/95 text-slate-200 font-mono text-xs overflow-y-auto custom-scrollbar p-2 space-y-4">
        
        <div className="flex items-center gap-2 px-2 py-1 mb-2 border-b border-border/40 pb-3">
          <Globe className="w-5 h-5 text-amber-500" />
          <div>
            <h2 className="text-sm font-bold text-amber-500 uppercase tracking-wider">World Studio</h2>
            <p className="text-[10px] text-muted-foreground">Author content, characters, and world events.</p>
          </div>
        </div>

        {categories.map((cat, idx) => (
          <div key={idx} className="space-y-2">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">{cat.title}</h3>
            <div className="grid grid-cols-1 gap-1">
              {cat.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      soundSynth?.playSelectSound?.();
                      if (item.mode) {
                        useEditorStore.getState().setStudioMode(item.mode as any);
                      } else {
                        openPanel(item.id as any);
                      }
                    }}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-border/40 transition-all text-left group cursor-pointer"
                  >
                    <div className="p-1.5 bg-black/40 rounded border border-white/5 group-hover:border-amber-500/50 transition-colors">
                      <Icon className="w-4 h-4 text-amber-500/70 group-hover:text-amber-400" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-200 group-hover:text-white">{item.label}</div>
                      <div className="text-[9px] text-muted-foreground">{item.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </DraggablePanel>
  );
}
