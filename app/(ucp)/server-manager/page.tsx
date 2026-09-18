'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/web/components/ui/card';
import { Button } from '@/web/components/ui/button';
import { Input } from '@/web/components/ui/input';
import { Terminal, Play, Square, RefreshCcw, Send, CheckCircle2, XCircle } from 'lucide-react';
import { startSampServer, stopSampServer, sendSampRcon, getSampStatus } from './actions';
import { toast } from 'sonner';

export default function ServerManagerPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<{ type: string; message: string }[]>([]);
  const [rconInput, setRconInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Initial status fetch
    getSampStatus().then(res => setIsRunning(res.isRunning));
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    // Connect to SSE log stream
    const eventSource = new EventSource('/api/samp/logs');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLogs(prev => [...prev, data]);
      } catch (e) {
        // Fallback
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

  useEffect(() => {
    // Auto-scroll logs
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

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
    <div className="container max-w-6xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold sg-text-gradient flex items-center gap-2">
            <Terminal className="w-8 h-8 text-primary" />
            SA-MP Server Manager
          </h1>
          <p className="text-muted-foreground mt-1">Manage process lifecycle and interact with the live console.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-card/50 backdrop-blur border border-border/50 px-4 py-2 rounded-lg">
          <span className="text-sm font-medium text-muted-foreground">Status:</span>
          {isRunning ? (
            <div className="flex items-center gap-1.5 text-emerald-500 font-bold bg-emerald-500/10 px-2 py-1 rounded">
              <CheckCircle2 className="w-4 h-4" /> ONLINE
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-rose-500 font-bold bg-rose-500/10 px-2 py-1 rounded">
              <XCircle className="w-4 h-4" /> OFFLINE
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Controls Sidebar */}
        <div className="space-y-4">
          <Card className="sg-glass border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Process Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleStart} 
                disabled={isRunning || isProcessing}
                className="w-full justify-start bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Play className="w-4 h-4 mr-2" /> Start Server
              </Button>
              <Button 
                onClick={handleStop} 
                disabled={!isRunning || isProcessing}
                variant="destructive"
                className="w-full justify-start"
              >
                <Square className="w-4 h-4 mr-2" /> Stop Server
              </Button>
              <Button 
                onClick={() => { handleStop().then(handleStart) }} 
                disabled={!isRunning || isProcessing}
                variant="outline"
                className="w-full justify-start"
              >
                <RefreshCcw className="w-4 h-4 mr-2" /> Restart Server
              </Button>
            </CardContent>
          </Card>
          
          <Card className="sg-glass border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Files</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">
                The server reads directly from the <code className="text-primary bg-primary/10 px-1 rounded">/samp-server</code> directory.
              </p>
              <Button variant="secondary" className="w-full text-xs">Manage Files (Coming Soon)</Button>
            </CardContent>
          </Card>
        </div>

        {/* Live Terminal */}
        <div className="md:col-span-3 flex flex-col min-h-[600px] max-h-[800px]">
          <Card className="flex-1 flex flex-col sg-glass border-border/50 overflow-hidden bg-[#0a0a0a]">
            {/* Terminal Header */}
            <div className="flex items-center px-4 py-2 bg-black/40 border-b border-border/30">
              <div className="flex gap-1.5 mr-4">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              </div>
              <span className="text-xs font-mono text-muted-foreground">server_log.txt / stdout</span>
            </div>

            {/* Terminal Output */}
            <div className="flex-1 p-4 overflow-y-auto font-mono text-sm space-y-1">
              {logs.length === 0 ? (
                <div className="text-zinc-600 italic">No logs yet. Start the server to begin capturing output.</div>
              ) : (
                logs.map((log, i) => {
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
                })
              )}
              <div ref={logsEndRef} />
            </div>

            {/* RCON Input */}
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
          </Card>
        </div>

      </div>
    </div>
  );
}
