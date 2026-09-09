import React from 'react';
import { useSessionStore } from '../state/useSessionStore';

export function CharacterCreateScene() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-[#050b14]">
      <div className="bg-card/40 border border-border/50 backdrop-blur-xl p-8 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col">
        <h2 className="text-2xl font-bold mb-6">Create Your Saint</h2>
        
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Character Creation UI (Phase 4)
        </div>
        
        <div className="flex justify-between mt-6">
          <button 
            className="btn btn-ghost"
            onClick={() => useSessionStore.getState().setScene('character_select')}
          >
            Back
          </button>
          <button className="btn btn-primary" disabled>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
