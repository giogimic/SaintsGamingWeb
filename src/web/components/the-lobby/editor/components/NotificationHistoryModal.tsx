'use client';

import React from 'react';
import { Bell, X, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { useGameStore } from '../../store';

export const NotificationHistoryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const toastHistory = useGameStore((s) => s.toastHistory || []);
  const clearToastHistory = useGameStore((s) => s.clearToastHistory);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-auto animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#0b1320] border border-[#806f47]/50 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#050b14] border-b border-[#806f47]/30">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-100 tracking-wide">Studio Activity & Notification Log</h2>
              <p className="text-[9px] text-slate-400">Recent studio events, saves, and notices</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {toastHistory.length > 0 && (
              <button
                type="button"
                onClick={() => clearToastHistory?.()}
                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 rounded transition-colors cursor-pointer"
                title="Clear notification log"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 rounded transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar divide-y divide-slate-800/60">
          {toastHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-slate-500 text-center space-y-2">
              <Bell className="w-8 h-8 stroke-1 text-slate-600" />
              <p className="text-xs font-mono">No notifications logged yet.</p>
              <p className="text-[10px] text-slate-600">Actions, saves, and mode changes will appear here.</p>
            </div>
          ) : (
            toastHistory.map((item) => {
              const time = new Date(item.timestamp).toLocaleTimeString();
              return (
                <div key={item.id} className="py-2 flex items-start gap-2.5 hover:bg-white/[0.02] px-1 rounded transition-colors">
                  <div className="mt-0.5 p-1 rounded bg-amber-500/10 text-amber-400 shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-200 font-mono leading-snug break-words">{item.message}</p>
                    <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono mt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{time}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#050b14] border-t border-[#806f47]/30 flex items-center justify-between text-[10px] text-slate-400">
          <span>{toastHistory.length} notification(s) stored</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 rounded font-bold transition-colors cursor-pointer text-[11px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
