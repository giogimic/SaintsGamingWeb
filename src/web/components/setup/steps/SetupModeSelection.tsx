'use client';

import React from 'react';
import { Sparkles, FolderDown, Clock, CheckCircle2, ArrowRight } from 'lucide-react';

interface SetupModeSelectionProps {
  onSelectFresh: () => void;
}

export function SetupModeSelection({ onSelectFresh }: SetupModeSelectionProps) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Choose Initialization Mode
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          Select how you want to set up this game. You can start fresh from a clean foundation or import an existing game archive.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* OPTION 1: FRESH GAME */}
          <div
            onClick={onSelectFresh}
            className="group relative rounded-3xl p-7 border transition-all cursor-pointer flex flex-col justify-between bg-gradient-to-br from-amber-950/20 via-slate-950/60 to-purple-950/20 border-amber-500/50 hover:border-amber-400 ring-2 ring-amber-400/20 shadow-2xl hover:scale-[1.01]"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-400/20 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-400/20 border border-amber-400/40 text-amber-300">
                  Recommended
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                  Fresh Game
                </h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  Create a brand-new game from a clean foundation. Configure your game identity, create characters, define environment tiles, and paint your starting map.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                Start Fresh Setup
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="w-6 h-6 rounded-full border border-amber-400 bg-amber-500 text-white flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* OPTION 2: IMPORT DATA (COMING SOON) */}
          <div className="relative rounded-3xl p-7 border transition-all flex flex-col justify-between bg-slate-950/40 border-slate-800/80 opacity-70 cursor-not-allowed">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center">
                  <FolderDown className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 border border-slate-700 text-amber-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Coming Soon
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-300">Import Data</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  Import an existing game archive, map collection, or asset database from an external backup package (.zip, JSON map package, or SQL export).
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
              <span>In Development</span>
              <span className="font-mono text-[10px] uppercase bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-400">
                Future Update
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
