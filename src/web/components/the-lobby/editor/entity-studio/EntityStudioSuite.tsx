'use client';

import React, { useState } from 'react';
import {
  Users,
  Package,
  Sword,
  PawPrint,
  LucideIcon,
  Globe,
  Settings2,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useEditorStore } from '../editor-store';
import { ArchetypeEditorWorkspace } from '../hero-studio/ArchetypeEditorWorkspace';
import { ItemEditorPanel } from '../panels/ItemEditorPanel';
import { NpcEditorPanel } from '../panels/NpcEditorPanel';
import { CreatureDefEditorPanel } from '../panels/CreatureDefEditorPanel';
import { MonsterEditorPanel } from '../panels/MonsterEditorPanel';

export type EntityWorkspaceId =
  | 'archetypes'
  | 'items'
  | 'npcs'
  | 'creatures'
  | 'monsters';

const WORKSPACE_META: Record<EntityWorkspaceId, { label: string; icon: LucideIcon; blurb: string; color: string }> = {
  archetypes: {
    label: 'Archetypes',
    icon: Users,
    blurb: 'Playable heroes, class loadouts, and base stats.',
    color: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
  },
  items: {
    label: 'Items',
    icon: Package,
    blurb: 'Weapons, armor, resources, and consumables.',
    color: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10',
  },
  npcs: {
    label: 'NPCs',
    icon: Globe,
    blurb: 'Vendors, quest givers, and companions.',
    color: 'text-purple-400 border-purple-500/40 bg-purple-500/10',
  },
  creatures: {
    label: 'Creatures',
    icon: PawPrint,
    blurb: 'Turn-based battle creatures and companions.',
    color: 'text-rose-400 border-rose-500/40 bg-rose-500/10',
  },
  monsters: {
    label: 'Monsters',
    icon: Sword,
    blurb: 'Action-combat world entities and bosses.',
    color: 'text-red-400 border-red-500/40 bg-red-500/10',
  },
};

const WORKSPACE_ORDER: EntityWorkspaceId[] = [
  'archetypes',
  'items',
  'npcs',
  'creatures',
  'monsters',
];

export function EntityStudioSuite() {
  const [activeWorkspace, setActiveWorkspace] = useState<EntityWorkspaceId>('archetypes');

  const renderContent = () => {
    switch (activeWorkspace) {
      case 'archetypes':
        return <ArchetypeEditorWorkspace />;
      case 'items':
        return <ItemEditorPanel />;
      case 'npcs':
        return <NpcEditorPanel />;
      case 'creatures':
        return <CreatureDefEditorPanel />;
      case 'monsters':
        return <MonsterEditorPanel />;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex h-full pointer-events-auto select-none overflow-hidden pb-9 bg-[#050b14]">
      {/* ─── Left Sidebar ─── */}
      <div className="w-64 flex-shrink-0 flex flex-col bg-[#030810]/95 border-r border-slate-800/60 overflow-y-auto">
        <div className="p-4 border-b border-slate-800/60 shrink-0">
          <h2 className="text-[14px] font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200 uppercase flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-amber-500" />
            Entity Studio
          </h2>
          <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-wider font-bold">
            Data Definition Editor
          </p>
        </div>

        <div className="flex-1 p-2 space-y-1">
          {WORKSPACE_ORDER.map((id) => {
            const meta = WORKSPACE_META[id];
            const Icon = meta.icon;
            const isActive = activeWorkspace === id;

            return (
              <button
                key={id}
                onClick={() => setActiveWorkspace(id)}
                className={cn(
                  'w-full flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer text-left border',
                  isActive
                    ? `bg-black border-slate-700/80 shadow-lg ${meta.color.split(' ')[0]}` // keep icon color
                    : 'bg-transparent border-transparent text-slate-500 hover:bg-white/5 hover:text-slate-300'
                )}
              >
                <div
                  className={cn(
                    'shrink-0 p-1.5 rounded-lg border',
                    isActive ? meta.color : 'bg-black/40 border-slate-800'
                  )}
                >
                  <Icon size={14} className={isActive ? 'opacity-100' : 'opacity-70'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-wider mb-0.5 truncate">
                    {meta.label}
                  </div>
                  <div className="text-[9px] text-slate-500 leading-tight">
                    {meta.blurb}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Main Area ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background/50">
        <div className="h-12 border-b border-slate-800/60 bg-[#050b14]/80 flex items-center px-4 shrink-0 backdrop-blur-md">
          <h3 className="text-sm font-black text-slate-200 tracking-wider">
            {WORKSPACE_META[activeWorkspace].label}
          </h3>
        </div>
        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
