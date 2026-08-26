'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Bug, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { useEditorStore } from './editor-store';
import type { RuleTracePayload } from '@/shared/net/protocol';

/**
 * A floating overlay that appears during Playtest mode to show the event stream
 * and trace the evaluation of RuleEngine conditions.
 */
export const RuleDebuggerOverlay: React.FC = () => {
  const isCreationMode = useEditorStore((s) => s.isCreationMode);
  const [isOpen, setIsOpen] = useState(true);
  const [traces, setTraces] = useState<RuleTracePayload[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleTrace = (e: CustomEvent<RuleTracePayload>) => {
      setTraces((prev) => {
        const next = [...prev, e.detail];
        if (next.length > 50) return next.slice(next.length - 50); // Keep last 50
        return next;
      });
    };
    
    window.addEventListener('studio_rule_trace', handleTrace as EventListener);
    return () => {
      window.removeEventListener('studio_rule_trace', handleTrace as EventListener);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [traces]);

  if (isCreationMode) return null;
  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="pointer-events-auto absolute bottom-4 left-4 bg-slate-900/90 border border-slate-700 p-2 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors shadow-lg z-50"
        title="Open Rule Debugger"
      >
        <Bug className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 w-80 max-h-96 bg-slate-900/95 border border-slate-700 rounded-lg shadow-2xl flex flex-col font-mono text-[10px] z-50 overflow-hidden backdrop-blur-sm">
      
      <div className="flex items-center justify-between p-2 border-b border-slate-800 bg-black/40">
        <div className="flex items-center gap-1.5 font-bold text-amber-400">
          <Bug className="w-3.5 h-3.5" />
          <span>Rule Debugger</span>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-slate-500 hover:text-slate-300"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-2">
        {traces.length === 0 ? (
          <div className="text-slate-500 italic text-center py-2">
            Listening for Playtest Events...
          </div>
        ) : (
          traces.map((trace, i) => (
            <div key={i} className="bg-black/50 border border-slate-800 rounded p-1.5">
              <div className="text-blue-400 font-semibold mb-1">
                EVAL [{trace.ruleId}] {trace.nodeType}
              </div>
              <div className="pl-2 border-l border-slate-700 space-y-1">
                <div className="text-slate-300">Evaluating Condition Node</div>
                <div className={`flex items-center gap-1 ${trace.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                  {trace.passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  <span>Expected: {JSON.stringify(trace.expected) ?? 'N/A'}</span>
                </div>
                {!trace.passed && (
                  <div className="text-slate-400 mt-1">
                    Found: {JSON.stringify(trace.actual) ?? 'N/A'}
                  </div>
                )}
                <div className="text-slate-400 mt-1">Result: <span className={`${trace.passed ? 'text-emerald-400' : 'text-red-400'} font-bold`}>{trace.passed ? 'PASSED' : 'FAILED'}</span></div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-1.5 border-t border-slate-800 bg-black/40 text-[9px] text-slate-500 flex justify-between">
        <span>Auto-scroll: ON</span>
        <button className="hover:text-slate-300 flex items-center gap-1" onClick={() => setTraces([])}>
          <Trash2 className="w-3 h-3" /> Clear
        </button>
      </div>
    </div>
  );
};

export default RuleDebuggerOverlay;
