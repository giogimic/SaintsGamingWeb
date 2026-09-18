'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/web/components/ui/card';
import { Button } from '@/web/components/ui/button';
import { Input } from '@/web/components/ui/input';
import { Terminal, Play, Square, RefreshCcw, Send, CheckCircle2, XCircle, FolderOpen, FileText, Save } from 'lucide-react';
import { startSampServer, stopSampServer, sendSampRcon, getSampStatus, readServerFile } from '@/../app/(ucp)/server-manager/actions';
import { toast } from 'sonner';

interface ServerManagerConsoleProps {
  isDrawerMode?: boolean;
  onManageFilesClick?: () => void;
}

export default function ServerManagerConsole({ isDrawerMode = false, onManageFilesClick }: ServerManagerConsoleProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<{ type: string; message: string }[]>([]);
  const [rconInput, setRconInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'rcon' | 'log'>('rcon');
  const [serverLogContent, setServerLogContent] = useState<string>('');
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const serverLogEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Initial status fetch
    getSampStatus().then(res => setIsRunning(res.isRunning));
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
    if (activeTab !== 'log') return;
    
    const fetchLog = async () => {
      const res = await readServerFile('server_log.txt');
      if (res.success && res.content !== undefined) {
        // Keep only the last ~200 lines to prevent massive DOM lag
        const lines = res.content.split('\n');
    let interval: NodeJS.Timeout;
    if (activeTab === 'log') {
      const fetchLog = async () => {
        const res = await readServerFile('server_log.txt');
        if (res.success) {
          setServerLogContent(res.content || 'File is empty.');
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
    setIsSavingExe(true);
    try {
      const m = await import('./launcher');
      const res = await m.setLauncherConfig(launcherExe);
      if (res.success) {
        toast.success('Start script saved');
      } else {
        toast.error('Failed to save script');
      }
    } catch (e: any) {
      toast.error('Error saving script');
    }
    setIsSavingExe(false);
  };

  const handleStart = async () => {
    setIsProcessing(true);
    const res = await startSampServer();
    if (res.success) {
      setIsRunning(true);
      toast.success('SA-MP Server starting...');
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
      toast.success('SA-MP Server stopped.');
    } else {
      toast.error(`Failed to stop: ${res.error}`);
    }
    setIsProcessing(false);
  };

  const handleRconSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rconInput.trim()) return;

    const cmd = rconInput;
    setRconInput('');
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

  return (
    <div className={`grid grid-cols-1 ${isDrawerMode ? 'md:grid-cols-1 gap-4' : 'md:grid-cols-4 gap-6'}`}>
      
      {/* Controls Sidebar */}
      <div className={`space-y-4 ${isDrawerMode ? 'flex gap-4 space-y-0' : ''}`}>
        <Card className={`sg-glass border-border/50 ${isDrawerMode ? 'flex-1' : ''}`}>
          <CardHeader className={isDrawerMode ? 'pb-2 pt-4 px-4' : ''}>
            <CardTitle className="text-lg flex items-center justify-between">
              Process Controls
              {isDrawerMode && (
                <div className="flex items-center gap-2">
                  {isRunning ? (
                    <div className="flex items-center gap-1.5 text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 text-xs rounded">
                      <CheckCircle2 className="w-3 h-3" /> ONLINE
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 text-xs rounded">
                      <XCircle className="w-3 h-3" /> OFFLINE
                    </div>
                  )}
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className={`space-y-3 ${isDrawerMode ? 'flex gap-2 space-y-0 px-4 pb-4' : ''}`}>
            
            <div className="flex gap-2 items-center pb-2">
              <input 
                type="text" 
                placeholder="samp-server.exe" 
                value={launcherExe}
                onChange={(e) => setLauncherExe(e.target.value)}
                className="w-full bg-black/50 border border-border/50 rounded px-2 py-1.5 text-xs font-mono"
                title="Start Script / Executable Name"
              />
              <Button size="sm" variant="secondary" onClick={handleSaveExe} disabled={isSavingExe} className="px-2 h-[28px]">
                <Save className="w-3 h-3" />
              </Button>
            </div>

            <Button 
              onClick={handleStart} 
              disabled={isRunning || isProcessing}
              className={`${isDrawerMode ? 'flex-1' : 'w-full'} justify-start bg-emerald-600 hover:bg-emerald-700 text-white`}
              size={isDrawerMode ? 'sm' : 'default'}
            >
              <Play className="w-4 h-4 mr-2" /> Start
            </Button>
            <Button 
              onClick={handleStop} 
              disabled={!isRunning || isProcessing}
              variant="destructive"
              className={`${isDrawerMode ? 'flex-1' : 'w-full'} justify-start`}
              size={isDrawerMode ? 'sm' : 'default'}
            >
              <Square className="w-4 h-4 mr-2" /> Stop
            </Button>
            {!isDrawerMode && (
              <Button 
                onClick={() => { handleStop().then(handleStart) }} 
                disabled={!isRunning || isProcessing}
                variant="outline"
                className="w-full justify-start"
              >
                <RefreshCcw className="w-4 h-4 mr-2" /> Restart Server
              </Button>
            )}
          </CardContent>
        </Card>
        
        <Card className={`sg-glass border-border/50 ${isDrawerMode ? 'flex-1' : ''}`}>
          <CardHeader className={isDrawerMode ? 'pb-2 pt-4 px-4' : ''}>
            <CardTitle className="text-lg">Files & Automation</CardTitle>
          </CardHeader>
          <CardContent className={isDrawerMode ? 'px-4 pb-4' : ''}>
            {!isDrawerMode && (
              <p className="text-xs text-muted-foreground mb-4">
                The server reads directly from the <code className="text-primary bg-primary/10 px-1 rounded">/samp-server</code> directory.
              </p>
            )}
            <Button 
              variant="secondary" 
              className="w-full text-xs" 
              size={isDrawerMode ? 'sm' : 'default'}
              onClick={onManageFilesClick}
            >
              <FolderOpen className="w-4 h-4 mr-2" /> Manage Files
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Live Terminal */}
      <div className={`${isDrawerMode ? 'h-[400px]' : 'md:col-span-3 min-h-[600px] max-h-[800px]'} flex flex-col`}>
        <Card className="flex-1 flex flex-col sg-glass border-border/50 overflow-hidden bg-[#0a0a0a]">
          {/* Terminal Header */}
          <div className="flex items-center px-4 py-2 bg-black/40 border-b border-border/30 gap-4">
            <div className="flex gap-1.5 mr-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveTab('rcon')}
                className={`text-xs font-mono px-3 py-1 rounded transition-colors flex items-center gap-2 ${activeTab === 'rcon' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground hover:bg-white/5'}`}
              >
                <Terminal className="w-3 h-3" />
                RCON / Live Stream
              </button>
              <button 
                onClick={() => setActiveTab('log')}
                className={`text-xs font-mono px-3 py-1 rounded transition-colors flex items-center gap-2 ${activeTab === 'log' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground hover:bg-white/5'}`}
              >
                <FileText className="w-3 h-3" />
                server_log.txt
              </button>
            </div>
          </div>

          {/* Terminal Output */}
          <div className="flex-1 p-4 overflow-y-auto font-mono text-sm space-y-1">
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

          {/* RCON Input */}
          {activeTab === 'rcon' && (
            <div className="p-3 bg-black/40 border-t border-border/30">
              <form onSubmit={handleRconSubmit} className="flex gap-2">
                <span className="text-primary font-bold font-mono py-2 pl-2">&gt;</span>
                <Input
                  value={rconInput}
                  onChange={(e) => setRconInput(e.target.value)}
                  placeholder="Send RCON command (e.g., echo test, varlist)..."
                  className="bg-transparent border-none focus-visible:ring-0 font-mono text-zinc-300"
                  disabled={!isRunning}
                />
                <Button type="submit" size="icon" variant="ghost" disabled={!isRunning || !rconInput.trim()} className="text-primary hover:text-primary/80 hover:bg-primary/10">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          )}
        </Card>
      </div>

    </div>
  );
}
