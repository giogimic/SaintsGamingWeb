import React from 'react';
import { useSessionStore } from '../state/useSessionStore';

export function TitleScene() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full relative">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/assets/backgrounds/title.jpg)' }} />
      <div className="absolute inset-0 bg-black/60" />
      <div className="z-10 flex flex-col items-center">
        <h1 className="text-6xl font-bold sg-text-gradient mb-8 tracking-widest uppercase">Saints</h1>
        <p className="text-xl text-primary/80 mb-12">Time To Play</p>
        
        {/* The BootSequence handles transition from this state based on auth.
            If the user is already authenticated but no character is selected,
            the BootSequence will move them to character_select. */}
        <div className="text-muted-foreground animate-pulse">
          Initializing Connection...
        </div>
      </div>
    </div>
  );
}
