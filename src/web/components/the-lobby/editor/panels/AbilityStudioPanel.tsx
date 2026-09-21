import React from 'react';
import { useEditorStore } from '../editor-store';
import { DraggablePanel } from '../DraggablePanel';
import {
  Sparkles, Shield, ScrollText, Hammer, Target, BookOpen, Crown
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

export function AbilityStudioPanel() {
  const panel = useEditorStore((s) => s.panels.abilityStudio);
  const openPanel = useEditorStore((s) => s.openPanel);
  if (!panel?.isOpen) return null;

  const categories = [
    {
      title: 'Systems & Mechanics',
      items: [
        { id: 'abilities', label: 'Abilities', icon: Sparkles, desc: 'Author active and passive abilities' },
        { id: 'classes', label: 'Classes', icon: Shield, desc: 'Design hero classes and skill trees' },
        { id: 'professions', label: 'Professions', icon: Hammer, desc: 'Configure crafting professions' },
        { id: 'recipes', label: 'Recipes', icon: ScrollText, desc: 'Manage crafting recipes' },
      ]
    }
  ];

  return (
    <DraggablePanel id="abilityStudio">
      <div className="flex flex-col h-full bg-[#050b14]/95 text-slate-200 font-mono text-xs overflow-y-auto custom-scrollbar p-2 space-y-4">
        
        <div className="flex items-center gap-2 px-2 py-1 mb-2 border-b border-border/40 pb-3">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Ability Studio</h2>
            <p className="text-[10px] text-muted-foreground">Design systems, classes, and abilities.</p>
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
                      if ((item as any).mode) {
                        useEditorStore.getState().setStudioMode((item as any).mode);
                      } else {
                        openPanel(item.id as any);
                      }
                    }}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-border/40 transition-all text-left group cursor-pointer"
                  >
                    <div className="p-1.5 bg-black/40 rounded border border-white/5 group-hover:border-cyan-500/50 transition-colors">
                      <Icon className="w-4 h-4 text-cyan-500/70 group-hover:text-cyan-400" />
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
