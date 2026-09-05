'use client';

import React from 'react';
import { Save, Plus, Trash2, ShieldAlert, Castle, RefreshCw } from 'lucide-react';
import { useSession } from 'next-auth/react';
import {
  WindowMenuBar,
  WindowMenuDropdown,
  WindowMenuButton,
  WindowMenuDivider,
} from '../WindowMenuBar';

export const DungeonStudioPanel: React.FC = () => {
  const { data: session } = useSession();
  const isAdmin = (session?.user?.permissionLevel ?? 0) >= 3;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center text-slate-400 font-mono text-xs">
        <ShieldAlert className="w-8 h-8 mb-2 text-red-500/50" />
        <p>Admin permissions required to modify Dungeon definitions.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#050b14]/90 text-slate-300 font-mono text-xs -m-3 mb-0 overflow-hidden">
      {/* ── WINDOW SUB-MENU APP BAR ── */}
      <WindowMenuBar>
        <WindowMenuDropdown
          label="Dungeon"
          icon={Castle}
          items={[
            {
              label: 'New Dungeon Instance',
              icon: Plus,
              onClick: () => {},
            },
            {
              label: 'Save Dungeon Config',
              icon: Save,
              onClick: () => {},
            },
          ]}
        />
        <WindowMenuDivider />
        <WindowMenuButton
          label="New Dungeon"
          icon={Plus}
          onClick={() => {}}
          title="Create a new dungeon instance profile"
        />
        <WindowMenuButton
          label="Save"
          icon={Save}
          onClick={() => {}}
          title="Save all changes to the active dungeon"
        />
        <div className="flex-1" />
        <span className="text-[9px] text-primary font-bold px-2 py-0.5 rounded bg-primary/10 border border-primary/30">
          Admin Dungeon Studio
        </span>
      </WindowMenuBar>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 border-r border-border/30 bg-[#060e1c]/80 flex flex-col">
          <div className="p-2 border-b border-border/20">
            <input 
              type="text" 
              placeholder="Search dungeons..." 
              className="w-full bg-black/40 border border-border/30 rounded px-2 py-1 text-slate-300 placeholder:text-muted-foreground focus:border-primary/50 outline-none text-xs"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <div className="p-2 mb-1 rounded bg-primary/15 border border-primary/40 cursor-pointer flex justify-between items-center group">
              <span className="text-primary font-bold">Example Dungeon</span>
              <Trash2 className="w-3.5 h-3.5 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          <div className="max-w-2xl space-y-4">
            
            <div className="space-y-3 bg-black/40 p-3.5 rounded-xl border border-border/30">
              <h3 className="text-xs font-bold text-primary border-b border-border/20 pb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                <Castle className="w-3.5 h-3.5 text-primary" /> Basic Info & Profile
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">ID</label>
                  <input type="text" className="w-full bg-black/30 border border-border/20 rounded px-2 py-1 text-slate-400 font-mono text-xs cursor-not-allowed" disabled value="example_dungeon_1" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Dungeon Name</label>
                  <input type="text" className="w-full bg-black/40 border border-border/30 rounded px-2 py-1 text-foreground focus:border-primary outline-none text-xs" defaultValue="Example Dungeon" />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] text-muted-foreground">Description</label>
                  <textarea className="w-full bg-black/40 border border-border/30 rounded px-2 py-1 text-foreground focus:border-primary outline-none h-16 text-xs" defaultValue="A subterranean trial with environmental hazards." />
                </div>
              </div>
            </div>

            <div className="space-y-3 bg-black/40 p-3.5 rounded-xl border border-border/30">
              <h3 className="text-xs font-bold text-sky-400 border-b border-border/20 pb-1.5 uppercase tracking-wider">
                Party Requirements & Limits
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Min Level</label>
                  <input type="number" className="w-full bg-black/40 border border-border/30 rounded px-2 py-1 text-foreground" defaultValue="1" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Max Level</label>
                  <input type="number" className="w-full bg-black/40 border border-border/30 rounded px-2 py-1 text-foreground" placeholder="None" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Max Players</label>
                  <input type="number" className="w-full bg-black/40 border border-border/30 rounded px-2 py-1 text-foreground" defaultValue="4" />
                </div>
              </div>
              <div className="pt-2 border-t border-border/10">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded bg-black/40 border-border/30 accent-primary cursor-pointer" />
                  <span className="text-foreground font-semibold">Is Instanced (Private Room)</span>
                </label>
                <p className="text-muted-foreground text-[10px] mt-1 ml-6 leading-tight">
                  If unchecked, all players share the public dungeon instance. 
                  If checked, a private shard is spawned per party.
                </p>
              </div>
            </div>

            <div className="space-y-3 bg-black/40 p-3.5 rounded-xl border border-border/30">
              <h3 className="text-xs font-bold text-amber-400 border-b border-border/20 pb-1.5 flex justify-between items-center uppercase tracking-wider">
                <span>Entry Conditions (Rule Engine)</span>
                <button className="px-2 py-0.5 bg-[#060e1c] rounded text-primary border border-primary/30 hover:bg-primary/20 text-[10px] transition-colors cursor-pointer">Edit Rules</button>
              </h3>
              <div className="p-2 bg-black/60 border border-border/20 rounded-lg font-mono text-[10px] text-emerald-400">
                {`{
  "type": "AND",
  "conditions": [
    { "type": "HAS_ITEM", "itemId": "dungeon_key_1", "qty": 1 }
  ]
}`}
              </div>
            </div>

            <div className="space-y-3 bg-black/40 p-3.5 rounded-xl border border-border/30">
              <h3 className="text-xs font-bold text-emerald-400 border-b border-border/20 pb-1.5 flex justify-between items-center uppercase tracking-wider">
                <span>Linked Maps & Regions</span>
                <button className="px-2 py-0.5 bg-[#060e1c] rounded text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 text-[10px] transition-colors cursor-pointer">Add Map</button>
              </h3>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2 bg-black/60 border border-border/20 rounded-lg">
                  <span className="text-emerald-300 font-bold">DEMO_SANDBOX</span>
                  <Trash2 className="w-3.5 h-3.5 text-rose-400 cursor-pointer hover:text-rose-300 transition-colors" />
                </div>
              </div>
              <p className="text-muted-foreground text-[10px] mt-1 leading-tight">
                Maps linked to this dungeon. When entering, the party is teleported to the default spawn coordinates of the first map.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default DungeonStudioPanel;
