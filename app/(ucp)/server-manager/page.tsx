'use client';

import React, { useState, useEffect } from 'react';
import { Terminal, CheckCircle2, XCircle } from 'lucide-react';
import { getSampStatus } from './actions';
import ServerManagerConsole from '@/web/components/server-manager/ServerManagerConsole';
import { UcpDraggableWindow } from '@/web/components/ucp/UcpDraggableWindow';
import ServerFileManager from '@/web/components/server-manager/ServerFileManager';

export default function ServerManagerPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [fileManagerOpen, setFileManagerOpen] = useState(false);
  
  useEffect(() => {
    getSampStatus().then(res => setIsRunning(res.isRunning));
    
    // Poll status lightly
    const interval = setInterval(() => {
      getSampStatus().then(res => setIsRunning(res.isRunning));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <div className="bg-amber-500/10 border border-amber-500/50 text-amber-500 p-4 rounded-lg flex items-center justify-center mb-6">
        <p className="font-semibold text-center">
          SA-MP Server Manager is currently disabled for maintenance and security upgrades.
        </p>
      </div>

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

      <ServerManagerConsole 
        isDrawerMode={false} 
        onManageFilesClick={() => setFileManagerOpen(true)}
      />

      {fileManagerOpen && (
        <UcpDraggableWindow title="Server File Manager" onClose={() => setFileManagerOpen(false)} defaultWidth={1150} defaultHeight={750}>
          <ServerFileManager />
        </UcpDraggableWindow>
      )}
    </div>
  );
}
