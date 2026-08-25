'use client';

import React, { useState } from 'react';
import { UserCircle, Swords, Users } from 'lucide-react';
import { ArchetypeEditorWorkspace } from './ArchetypeEditorWorkspace';
import { ClassEditorWorkspace } from './ClassEditorWorkspace';

export type HeroWorkspaceId = 'archetypes' | 'classes';

export function HeroStudioSuite() {
  const [activeWorkspace, setActiveWorkspace] = useState<HeroWorkspaceId>('archetypes');

  const renderContent = () => {
    switch (activeWorkspace) {
      case 'archetypes':
        return <ArchetypeEditorWorkspace />;
      case 'classes':
        return <ClassEditorWorkspace />;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex h-full pointer-events-auto select-none overflow-hidden">
      {/* ─── Left Sidebar: Workspace Navigation ─── */}
      <div className="w-56 flex-shrink-0 flex flex-col bg-[#030810]/95 border-r border-slate-800/60 overflow-y-auto">
        {/* Sidebar Header */}
        <div className="px-4 py-3 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-pink-500/20 border border-pink-500/40 text-pink-400">
              <UserCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[11px] font-black tracking-wider text-pink-400 uppercase">
                Hero Studio
              </h2>
              <p className="text-[9px] text-slate-500">Manage Classes & Archetypes</p>
            </div>
          </div>
        </div>

        {/* Workspace List */}
        <div className="flex-1 py-2 px-2 space-y-1">
          <button
            onClick={() => setActiveWorkspace('archetypes')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer group ${
              activeWorkspace === 'archetypes'
                ? 'text-pink-400 border border-pink-500/40 bg-pink-500/10 shadow-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <Users className={`w-4 h-4 flex-shrink-0 ${activeWorkspace === 'archetypes' ? '' : 'text-slate-500 group-hover:text-slate-300'}`} />
            <div className="min-w-0">
              <div className={`text-[11px] font-bold truncate ${activeWorkspace === 'archetypes' ? '' : 'group-hover:text-slate-200'}`}>
                Archetypes
              </div>
              {activeWorkspace === 'archetypes' && (
                <div className="text-[9px] text-inherit opacity-70 mt-0.5 line-clamp-2">
                  Starter templates and loadouts.
                </div>
              )}
            </div>
          </button>

          <button
            onClick={() => setActiveWorkspace('classes')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer group ${
              activeWorkspace === 'classes'
                ? 'text-cyan-400 border border-cyan-500/40 bg-cyan-500/10 shadow-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <Swords className={`w-4 h-4 flex-shrink-0 ${activeWorkspace === 'classes' ? '' : 'text-slate-500 group-hover:text-slate-300'}`} />
            <div className="min-w-0">
              <div className={`text-[11px] font-bold truncate ${activeWorkspace === 'classes' ? '' : 'group-hover:text-slate-200'}`}>
                Classes
              </div>
              {activeWorkspace === 'classes' && (
                <div className="text-[9px] text-inherit opacity-70 mt-0.5 line-clamp-2">
                  Class definitions and combat stats.
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Sidebar Footer */}
        <div className="px-3 py-2 border-t border-slate-800/60">
          <div className="text-[9px] text-slate-600 text-center">
            Hero Studio Workspace
          </div>
        </div>
      </div>

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#050b14]/90">
        <div className="flex-1 overflow-auto">{renderContent()}</div>
      </div>
    </div>
  );
}
