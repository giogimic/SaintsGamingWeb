"use client";

import { useState, useEffect } from "react";
import { Terminal, Activity, Server, Clock, Monitor } from "lucide-react";
import { usePathname } from "next/navigation";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function DevOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [clientMetrics, setClientMetrics] = useState({
    fps: 60,
    width: 0,
    height: 0,
  });
  
  const pathname = usePathname();

  // Only poll server metrics if the overlay is actually open
  const { data: serverMetrics } = useSWR(
    isOpen ? "/api/dev/metrics" : null, 
    fetcher, 
    { refreshInterval: 2000 }
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle on Ctrl + ` or Ctrl + ~
      if (e.ctrlKey && (e.key === '`' || e.key === '~')) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const updateMetrics = () => {
      const now = performance.now();
      frameCount++;

      if (now - lastTime >= 1000) {
        setClientMetrics({
          fps: Math.round((frameCount * 1000) / (now - lastTime)),
          width: window.innerWidth,
          height: window.innerHeight,
        });
        frameCount = 0;
        lastTime = now;
      }
      animationFrameId = requestAnimationFrame(updateMetrics);
    };

    updateMetrics();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[9999] flex items-start justify-center pt-16">
      <div className="pointer-events-auto bg-black/80 backdrop-blur-md border border-green-500/50 text-green-500 font-mono text-xs rounded-lg p-4 shadow-2xl w-[400px] max-w-full relative overflow-hidden">
        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.2)_50%)] bg-[length:100%_4px] opacity-20"></div>
        
        <div className="flex items-center justify-between border-b border-green-500/30 pb-2 mb-3 relative z-10">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Terminal className="h-4 w-4" />
            Saints Gaming Dev Console
          </div>
          <button onClick={() => setIsOpen(false)} className="hover:text-green-300">
            [ESC]
          </button>
        </div>

        <div className="space-y-3 relative z-10">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 bg-green-950/30 p-2 rounded border border-green-900/30">
              <Activity className="h-4 w-4 text-green-400" />
              <div>
                <div className="text-green-600 text-[10px]">FPS</div>
                <div className="font-bold">{clientMetrics.fps}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-green-950/30 p-2 rounded border border-green-900/30">
              <Server className="h-4 w-4 text-green-400" />
              <div>
                <div className="text-green-600 text-[10px]">Node Heap</div>
                <div className="font-bold">{serverMetrics?.memoryHeap ? `${serverMetrics.memoryHeap} MB` : 'Loading...'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-green-950/30 p-2 rounded border border-green-900/30">
              <Monitor className="h-4 w-4 text-green-400" />
              <div>
                <div className="text-green-600 text-[10px]">Viewport</div>
                <div className="font-bold">{clientMetrics.width}x{clientMetrics.height}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-green-950/30 p-2 rounded border border-green-900/30">
              <Clock className="h-4 w-4 text-green-400" />
              <div>
                <div className="text-green-600 text-[10px]">Uptime</div>
                <div className="font-bold">
                  {serverMetrics?.uptime 
                    ? `${Math.floor(serverMetrics.uptime / 60)}m ${serverMetrics.uptime % 60}s` 
                    : 'Loading...'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-950/20 border border-green-900/30 p-2 rounded">
            <div className="text-green-600 mb-1 flex justify-between">
              <span>Current Route:</span>
              <span>{serverMetrics?.environment || '...'}</span>
            </div>
            <div className="text-green-300 break-all">{pathname}</div>
          </div>
          
          <div className="bg-green-950/20 border border-green-900/30 p-2 rounded">
            <div className="text-green-600 mb-1">Session Auth:</div>
            <div className="text-green-300">
              Active {serverMetrics?.activeSession ? `(${serverMetrics.activeSession})` : ''}
            </div>
          </div>

          <div className="text-[10px] text-green-700 text-center pt-2">
            Press Ctrl + ` to hide
          </div>
        </div>
      </div>
    </div>
  );
}
