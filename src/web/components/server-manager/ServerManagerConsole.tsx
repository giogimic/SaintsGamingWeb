'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/web/components/ui/card';
import { Button } from '@/web/components/ui/button';
import { Input } from '@/web/components/ui/input';
import { Terminal, Play, Square, RefreshCcw, Send, CheckCircle2, XCircle, FolderOpen, FileText, Save, Cpu, Layers, ExternalLink, Minimize2 } from 'lucide-react';
import { startSampServer, stopSampServer, restartSampServer, sendSampRcon, getSampStatus, readServerFile } from '@/../app/(ucp)/server-manager/actions';
import { toast } from 'sonner';
import { UcpDraggableWindow } from '@/web/components/ucp/UcpDraggableWindow';

interface ServerManagerConsoleProps {
  isDrawerMode?: boolean;
  onManageFilesClick?: () => void;
}

export default function ServerManagerConsole({ isDrawerMode = false, onManageFilesClick }: ServerManagerConsoleProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [serverPid, setServerPid] = useState<number | null>(null);
  const [platform, setPlatform] = useState<string>('');
  const [logs, setLogs] = useState<{ type: string; message: string }[]>([]);
  const [rconInput, setRconInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [launcherExe, setLauncherExe] = useState('');
  const [isSavingExe, setIsSavingExe] = useState(false);
  const [availableLaunchers, setAvailableLaunchers] = useState<string[]>([]);
  const [isPoppedOut, setIsPoppedOut] = useState(false);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'rcon' | 'log'>('rcon');
  const [serverLogContent, setServerLogContent] = useState<string>('');
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const serverLogEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Initial status fetch
    getSampStatus().then(res => {
      setIsRunning(res.isRunning);
      if (res.pid) setServerPid(res.pid);
      if (res.platform) setPlatform(res.platform);
    });

    import('@/../app/(ucp)/server-manager/launcher').then(m => m.getLauncherConfig()).then(res => {
      if (res.success && res.executable) {
        setLauncherExe(res.executable.replace(/^(\.\/|\.\\)/, ''));
      } else if (res.defaultExecutable) {
        setLauncherExe(res.defaultExecutable.replace(/^(\.\/|\.\\)/, ''));
      }
      if (res.platform) setPlatform(res.platform);
    });
    
    // Fetch available start scripts & binaries
    import('@/../app/(ucp)/server-manager/actions').then(m => m.listServerFiles('')).then(res => {
      if (res.success && res.files) {
        const launchers = res.files
          .filter((f: any) => !f.isDirectory && (
            f.name.endsWith('.sh') || 
            f.name.endsWith('.exe') || 
            f.name.includes('samp03svr') || 
            f.name.includes('omp-server') || 
            f.name.includes('announce')
          ))
          .map((f: any) => f.name);
        setAvailableLaunchers(launchers);
      }
    });
  }, []);

  // Poll server process status
  useEffect(() => {
    const interval = setInterval(() => {
      getSampStatus().then(res => {
        setIsRunning(res.isRunning);
        setServerPid(res.pid ?? null);
        if (res.platform) setPlatform(res.platform);
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // RCON Live SSE Stream
  useEffect(() => {
    if (!isRunning) return;

    const eventSource = new EventSource('/api/samp/logs');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLogs(prev => [...prev, data]);
      } catch (e) {
        setLogs(prev => [...prev, { type: 'log', message: event.data }]);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [isRunning]);

  // Server Log Polling
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTab === 'log') {
      const fetchLog = async () => {
        const res = await readServerFile('server_log.txt');
        if (res.success) {
          const lines = (res.content || 'File is empty.').split('\n');
          const lastLines = lines.slice(-200).join('\n');
          setServerLogContent(lastLines);
        } else {
          setServerLogContent(`Could not read server_log.txt: ${res.error}`);
        }
      };
      fetchLog();
      interval = setInterval(fetchLog, 2000);
    }
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'rcon' && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, activeTab]);
  
  useEffect(() => {
    if (activeTab === 'log' && serverLogEndRef.current) {
      serverLogEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [serverLogContent, activeTab]);

  const handleSaveExe = async () => {
    if (!launcherExe.trim()) return;
    setIsSavingExe(true);
    try {
      const m = await import('@/../app/(ucp)/server-manager/launcher');
      const isWin = platform === 'win32';
      const executableStr = isWin 
        ? launcherExe 
        : (launcherExe.startsWith('./') ? launcherExe : `./${launcherExe}`);
      const res = await m.setLauncherConfig(executableStr);
      if (res.success) {
        toast.success('Executable configuration saved');
      } else {
        toast.error('Failed to save configuration');
      }
    } catch (e: any) {
      toast.error('Error saving configuration');
    }
    setIsSavingExe(false);
  };

  const handleStart = async () => {
    setIsProcessing(true);
    const res = await startSampServer();
    if (res.success) {
      setIsRunning(true);
      if (res.pid) setServerPid(res.pid);
      toast.success(`Server started! (PID: ${res.pid || 'Active'})`);
    } else {
      toast.error(`Failed to start: ${res.error}`);
    }
    setIsProcessing(false);
  };

  const handleStop = async () => {
    setIsProcessing(true);
    const res = await stopSampServer();
    if (res.success) {
      setIsRunning(false);
      setServerPid(null);
      toast.success('Server stopped.');
    } else {
      toast.error(`Failed to stop: ${res.error}`);
    }
    setIsProcessing(false);
  };

  const handleRestart = async () => {
    setIsProcessing(true);
    toast.info('Restarting server process...');
    const res = await restartSampServer();
    if (res.success) {
      setIsRunning(true);
      if (res.pid) setServerPid(res.pid);
      toast.success(`Server restarted successfully! (PID: ${res.pid})`);
    } else {
      toast.error(`Failed to restart: ${res.error}`);
    }
    setIsProcessing(false);
  };

  const handleRconSubmit = async (e: React.FormEvent, customCmd?: string) => {
    if (e) e.preventDefault();
    const cmd = (customCmd || rconInput).trim();
    if (!cmd) return;

    if (!customCmd) setRconInput('');
    setLogs(prev => [...prev, { type: 'rcon_cmd', message: `> ${cmd}` }]);

    const res = await sendSampRcon(cmd);
    if (res.success) {
      if (res.response) {
        setLogs(prev => [...prev, { type: 'rcon_res', message: res.response }]);
      }
    } else {
      toast.error(`RCON failed: ${res.error}`);
    }
  };

  const isLinux = platform !== 'win32';

  const terminalContent = (
    <Card className="flex-1 flex flex-col sg-glass border-border/50 overflow-hidden bg-[#070d18] h-full">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black/50 border-b border-border/30">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5 mr-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('rcon')}
              className={`text-xs font-mono px-3 py-1 rounded transition-colors flex items-center gap-2 cursor-pointer ${activeTab === 'rcon' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground hover:bg-white/5'}`}
            >
              <Terminal className="w-3 h-3" />
              RCON / Live Stream
            </button>
            <button 
              onClick={() => setActiveTab('log')}
              className={`text-xs font-mono px-3 py-1 rounded transition-colors flex items-center gap-2 cursor-pointer ${activeTab === 'log' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground hover:bg-white/5'}`}
            >
              <FileText className="w-3 h-3" />
              server_log.txt
            </button>
          </div>
        </div>

        {/* Status Indicator in Header */}
        <div className="flex items-center gap-2">
          {isPoppedOut && (
            <Button variant="ghost" size="sm" onClick={() => setIsPoppedOut(false)} className="h-6 px-2 text-xs font-mono text-muted-foreground hover:text-white mr-2">
              <Minimize2 className="w-3 h-3 mr-1" /> Dock
            </Button>
          )}
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
          <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase">
            {isRunning ? 'Running' : 'Stopped'}
          </span>
        </div>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 p-4 overflow-y-auto font-mono text-xs sm:text-sm space-y-1 custom-scrollbar">
        {activeTab === 'rcon' ? (
          // RCON Tab
          logs.length === 0 ? (
            <div className="text-zinc-600 italic">No logs yet. Start the server to begin capturing output.</div>
          ) : (
            <>
              {logs.map((log, i) => {
                let colorClass = 'text-zinc-300';
                if (log.type === 'error' || log.message.toLowerCase().includes('error')) colorClass = 'text-rose-400';
                else if (log.message.includes('has joined')) colorClass = 'text-emerald-400';
                else if (log.type === 'rcon_cmd') colorClass = 'text-primary font-bold';
                else if (log.type === 'sys') colorClass = 'text-amber-400 italic';
                
                return (
                  <div key={i} className={`break-words whitespace-pre-wrap ${colorClass}`}>
                    {log.message}
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </>
          )
        ) : (
          // Server Log Tab
          <div className="text-zinc-300 break-words whitespace-pre-wrap">
            {serverLogContent || <span className="text-zinc-600 italic">Loading server_log.txt...</span>}
            <div ref={serverLogEndRef} />
          </div>
        )}
      </div>

      {/* Quick Command Chips & RCON Input */}
      {activeTab === 'rcon' && (
        <div className="p-3 bg-black/50 border-t border-border/30 space-y-2 shrink-0">
          {/* Quick Action Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px] font-mono">
            <span className="text-muted-foreground text-[10px] uppercase font-bold shrink-0">Quick Cmds:</span>
            {[
              { label: 'players', cmd: 'players' },
              { label: 'varlist', cmd: 'varlist' },
              { label: 'gmx (restart mode)', cmd: 'gmx' },
              { label: 'say Online', cmd: 'say Saints Server is online!' },
            ].map((chip) => (
              <button
                key={chip.cmd}
                onClick={(e) => handleRconSubmit(e, chip.cmd)}
                disabled={!isRunning}
                className="px-2 py-0.5 rounded bg-black/40 hover:bg-primary/20 border border-border/40 hover:border-primary/50 text-zinc-300 hover:text-primary transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* RCON Input Form */}
          <form onSubmit={handleRconSubmit} className="flex gap-2 items-center bg-black/60 rounded border border-border/40 px-2 py-0.5">
            <span className="text-primary font-bold font-mono pl-1">&gt;</span>
            <Input
              value={rconInput}
              onChange={(e) => setRconInput(e.target.value)}
              placeholder="Send RCON command (e.g., varlist, echo test, say Hello)..."
              className="bg-transparent border-none focus-visible:ring-0 font-mono text-zinc-200 text-xs sm:text-sm h-8"
              disabled={!isRunning}
            />
            <Button 
              type="submit" 
              size="icon" 
              variant="ghost" 
              disabled={!isRunning || !rconInput.trim()} 
              className="text-primary hover:text-primary/80 hover:bg-primary/10 h-7 w-7 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      )}
    </Card>
  );

  return (
    <div className="flex flex-col w-full space-y-4">
      
      {/* Compact Controls Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-card/40 border border-border/50 rounded-lg p-3 sg-glass">
        
        {/* Left: Executable & Environment */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold mb-0.5">Executable</span>
            <div className="flex items-center gap-1.5">
              <select
                value={launcherExe}
                onChange={(e) => setLauncherExe(e.target.value)}
                className="bg-black/60 border border-border/50 rounded px-2 py-1 text-xs font-mono text-zinc-200 focus:outline-none focus:ring-1 focus:ring-primary w-40 h-8"
              >
                {!availableLaunchers.includes(launcherExe) && launcherExe && (
                  <option value={launcherExe}>{launcherExe}</option>
                )}
                {availableLaunchers.length === 0 && !launcherExe && (
                  <option value={isLinux ? 'omp-server' : 'omp-server.exe'}>
                    {isLinux ? 'omp-server' : 'omp-server.exe'}
                  </option>
                )}
                {availableLaunchers.map(launcher => (
                  <option key={launcher} value={launcher}>{launcher}</option>
                ))}
              </select>
              <Button size="icon" variant="secondary" onClick={handleSaveExe} disabled={isSavingExe} className="h-8 w-8 cursor-pointer" title="Save Default">
                <Save className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          
          <div className="hidden lg:flex flex-col ml-2">
            <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold mb-0.5">Platform</span>
            <span className="text-[11px] font-mono px-2 py-1 h-8 flex items-center rounded bg-primary/10 border border-primary/20 text-primary font-bold">
              {isLinux ? 'Debian / Linux' : 'Windows'}
            </span>
          </div>
        </div>

        {/* Middle: Actions */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-center">
          <Button onClick={handleStart} disabled={isRunning || isProcessing} size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs h-8 shadow-lg shadow-emerald-600/10">
            <Play className="w-3.5 h-3.5 mr-1.5" /> Start
          </Button>
          <Button onClick={handleStop} disabled={!isRunning || isProcessing} size="sm" variant="destructive" className="font-mono font-bold text-xs h-8">
            <Square className="w-3.5 h-3.5 mr-1.5" /> Stop
          </Button>
          <Button onClick={handleRestart} disabled={!isRunning || isProcessing} size="sm" variant="outline" className="font-mono text-xs border-border/60 hover:bg-white/5 h-8">
            <RefreshCcw className="w-3 h-3 mr-1.5 text-amber-400" /> Restart
          </Button>
        </div>

        {/* Right: Files & Popout */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          <Button variant="secondary" size="sm" className="text-xs font-mono cursor-pointer h-8" onClick={onManageFilesClick}>
            <FolderOpen className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> Files
          </Button>
          <Button variant="outline" size="sm" className={`text-xs font-mono cursor-pointer h-8 ${isPoppedOut ? 'bg-primary/20 border-primary/50 text-primary' : ''}`} onClick={() => setIsPoppedOut(!isPoppedOut)}>
            {isPoppedOut ? <Minimize2 className="w-3.5 h-3.5 mr-1.5" /> : <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-primary" />}
            {isPoppedOut ? 'Dock Console' : 'Pop Out'}
          </Button>
        </div>
      </div>

      {/* Terminal View */}
      {!isPoppedOut ? (
        <div className={`${isDrawerMode ? 'h-[400px]' : 'min-h-[500px] h-[65vh] max-h-[800px]'} flex flex-col w-full`}>
          {terminalContent}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center min-h-[300px] border border-dashed border-border/50 rounded-lg bg-black/20">
          <div className="text-center space-y-3">
            <Terminal className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
            <p className="text-sm font-mono text-muted-foreground">Console is popped out.</p>
            <Button variant="outline" size="sm" onClick={() => setIsPoppedOut(false)} className="text-xs font-mono">
              <Minimize2 className="w-3.5 h-3.5 mr-2" /> Dock Console Here
            </Button>
          </div>
        </div>
      )}

      {/* Draggable Pop-out */}
      {isPoppedOut && (
        <UcpDraggableWindow 
          title="SA-MP Live Console" 
          onClose={() => setIsPoppedOut(false)} 
          defaultWidth={850} 
          defaultHeight={600}
        >
          {terminalContent}
        </UcpDraggableWindow>
      )}
    </div>
  );
}
