'use client';

import React, { useState } from 'react';
import { Card } from '@/web/components/ui/card';
import { Button } from '@/web/components/ui/button';
import { Input } from '@/web/components/ui/input';
import { DownloadCloud, Rocket, FileArchive, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { downloadAndExtractServer, installLatestOMP } from '@/../app/(ucp)/server-manager/actions';

export default function ServerFileManager() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [archiveUrl, setArchiveUrl] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const handleInstallLatestOMP = async () => {
    setIsProcessing(true);
    addLog('Initiating open.mp (OMP) latest installation...');
    try {
      const res = await installLatestOMP();
      if (res.success) {
        addLog('Installation successful! You can now start the server.');
        toast.success('open.mp installed successfully!');
      } else {
        addLog(`Error: ${res.error}`);
        toast.error('Failed to install open.mp');
      }
    } catch (e: any) {
      addLog(`Exception: ${e.message}`);
    }
    setIsProcessing(false);
  };

  const handleCustomArchiveDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archiveUrl.trim()) return;

    setIsProcessing(true);
    addLog(`Downloading archive from: ${archiveUrl}`);
    try {
      const res = await downloadAndExtractServer(archiveUrl);
      if (res.success) {
        addLog('Archive downloaded and extracted successfully.');
        toast.success('Archive installed!');
        setArchiveUrl('');
      } else {
        addLog(`Error: ${res.error}`);
        toast.error('Failed to install archive');
      }
    } catch (e: any) {
      addLog(`Exception: ${e.message}`);
    }
    setIsProcessing(false);
  };

  return (
    <div className="flex flex-col h-full bg-background/50">
      <div className="p-4 space-y-6 flex-1 overflow-auto">
        
        {/* Quick Setups */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
            <Rocket className="w-4 h-4" /> Quick Setup
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <Card className="bg-black/40 border-border/40 p-4 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-foreground">open.mp (Latest)</h4>
                <p className="text-xs text-muted-foreground mt-1">Downloads the latest compatible Windows/Linux open.mp server binaries directly from GitHub.</p>
              </div>
              <Button 
                onClick={handleInstallLatestOMP} 
                disabled={isProcessing}
                className="bg-primary text-black hover:bg-primary/80 font-bold"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Install'}
              </Button>
            </Card>
          </div>
        </div>

        {/* Custom Archive URL */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
            <DownloadCloud className="w-4 h-4" /> Custom Archive
          </h3>
          <Card className="bg-black/40 border-border/40 p-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Provide a direct URL to a <code className="text-primary">.zip</code> or <code className="text-primary">.tar.gz</code> server archive. 
              The system will automatically download and extract it into the <code className="text-primary">/samp-server</code> directory.
            </p>
            <form onSubmit={handleCustomArchiveDownload} className="flex gap-2">
              <Input
                placeholder="https://example.com/my-gamemode.zip"
                value={archiveUrl}
                onChange={(e) => setArchiveUrl(e.target.value)}
                disabled={isProcessing}
                className="font-mono text-xs bg-black/60"
              />
              <Button type="submit" disabled={isProcessing || !archiveUrl} variant="secondary">
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileArchive className="w-4 h-4 mr-2" />}
                Extract
              </Button>
            </form>
          </Card>
        </div>

        {/* Action Logs */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Action Logs
          </h3>
          <div className="bg-[#0a0a0a] border border-border/30 rounded-lg p-3 min-h-[100px] max-h-[150px] overflow-y-auto font-mono text-[10px] space-y-1">
            {logs.length === 0 ? (
              <span className="text-zinc-600 italic">No recent actions...</span>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={log.includes('Error') ? 'text-rose-400' : 'text-emerald-400/80'}>{log}</div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
