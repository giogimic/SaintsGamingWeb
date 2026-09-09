import React from 'react';
import { useSessionStore } from '../state/useSessionStore';

export function OfflineScene() {
  const connectionStatus = useSessionStore((s: any) => s.connectionStatus);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-black">
      <div className="bg-card/40 border border-border/50 backdrop-blur-xl p-8 rounded-xl flex flex-col items-center max-w-md text-center">
        <div className="text-destructive mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">Connection Lost</h2>
        <p className="text-muted-foreground mb-6">
          {connectionStatus === 'reconnecting' 
            ? 'Attempting to reconnect to the server...' 
            : 'You have been disconnected from the game server.'}
        </p>
        
        {connectionStatus === 'reconnecting' && (
          <div className="loading loading-spinner loading-md text-primary" />
        )}
        
        {connectionStatus === 'disconnected' && (
          <button 
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        )}
      </div>
    </div>
  );
}
