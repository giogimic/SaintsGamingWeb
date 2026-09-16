'use client';

import React from 'react';
import { CheckCircle2, Loader2, XCircle, SkipForward, AlertCircle, Copy, Terminal } from 'lucide-react';
import type { DiagnosticEvent } from '@/server/diagnostics/SetupLogger';

const ALL_STAGES = [
  '01. Validate Setup Input',
  '02. Create / Update WorldProject',
  '03. Create Working World',
  '04. Create WorldMap',
  '05. Configure Map',
  '06. Create WorldBootstrapRevision',
  '07. Bake / Generate Terrain',
  '08. Validate Bootstrap',
  '09. Compile WorldRelease',
  '10. Publish Release',
  '11. Deploy Release',
  '12. Notify Go Runtime',
  '13. Ready'
];

export function DiagnosticConsole({ events }: { events: DiagnosticEvent[] }) {
  const handleCopy = () => {
    const text = events.map(e => `[${new Date(e.timestamp).toISOString()}] [${e.stageCode}] status=${e.status} msg="${e.message}"${e.error ? ` ERROR="${e.error}"` : ''}${e.metadata ? ` data=${JSON.stringify(e.metadata)}` : ''}`).join('\n');
    navigator.clipboard.writeText(text);
  };

  const getStageLatestEvent = (stageName: string) => {
    const stageEvents = events.filter(e => e.stageName === stageName);
    return stageEvents[stageEvents.length - 1];
  };

  return (
    <div className="w-full flex flex-col font-mono text-xs border border-slate-700 shadow-inner bg-[#050b14] rounded-xl overflow-hidden">
      
      {/* PIPELINE LIST */}
      <div className="p-4 bg-[#0a1220] border-b border-slate-800">
        <div className="flex items-center justify-between mb-3 text-slate-400 font-bold tracking-widest uppercase text-[10px]">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5" />
            Initialization Pipeline
          </div>
        </div>
        
        <div className="space-y-1.5">
          {ALL_STAGES.map(stage => {
            const ev = getStageLatestEvent(stage);
            const isPending = !ev;
            const status = ev?.status || 'PENDING';
            
            return (
              <div key={stage} className={`flex items-center justify-between py-1 px-2 rounded ${
                status === 'RUNNING' ? 'bg-sky-500/10' : 
                status === 'FAILED' ? 'bg-red-500/10' : 
                status === 'SKIPPED' ? 'opacity-50' : ''
              }`}>
                <div className="flex items-center gap-2.5">
                  {status === 'COMPLETED' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {status === 'RUNNING' && <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />}
                  {status === 'FAILED' && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                  {status === 'SKIPPED' && <SkipForward className="w-3.5 h-3.5 text-slate-500" />}
                  {status === 'WARNING' && <AlertCircle className="w-3.5 h-3.5 text-amber-400" />}
                  {status === 'PENDING' && <div className="w-3.5 h-3.5 border border-slate-700 rounded-full" />}
                  
                  <span className={`${status === 'FAILED' ? 'text-red-300' : status === 'COMPLETED' ? 'text-slate-200' : status === 'RUNNING' ? 'text-sky-300' : 'text-slate-500'}`}>
                    {stage}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  {ev && status === 'SKIPPED' && <span className="text-[10px] text-slate-500 font-bold">SKIPPED</span>}
                  {ev && status === 'FAILED' && <span className="text-[10px] text-red-400 font-bold">FAILED</span>}
                  {ev && ev.durationMs !== undefined && status === 'COMPLETED' && (
                    <span className="text-[10px] text-slate-400">{ev.durationMs}ms</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TERMINAL LOG */}
      <div className="p-4 bg-black h-48 overflow-y-auto font-mono text-[10px] leading-relaxed break-all">
        <div className="flex justify-end mb-2 sticky top-0">
          <button 
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
          >
            <Copy className="w-3 h-3" /> Copy Diagnostics
          </button>
        </div>
        
        {events.length === 0 && <span className="text-slate-600">Waiting for pipeline to start...</span>}
        
        {events.map(ev => {
          const isError = ev.status === 'FAILED';
          const time = new Date(ev.timestamp).toISOString().split('T')[1].replace('Z', '');
          
          return (
            <div key={ev.id} className={`mb-1.5 ${isError ? 'text-red-400' : 'text-slate-400'}`}>
              <span className="text-slate-600 mr-2">{time}</span>
              <span className={isError ? 'text-red-500' : 'text-sky-600'}>[{ev.stageCode}]</span>
              <span className="ml-2">{ev.message}</span>
              {ev.metadata && (
                <div className="pl-16 mt-0.5 opacity-80 whitespace-pre-wrap">
                  {JSON.stringify(ev.metadata, null, 2)}
                </div>
              )}
              {ev.error && (
                <div className="pl-16 mt-0.5 text-red-500 whitespace-pre-wrap">
                  ERROR: {ev.error}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
