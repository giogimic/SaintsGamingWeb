import React, { useEffect, useState } from 'react';
import { useSessionStore } from '../state/useSessionStore';

export function CharacterSelectScene() {
  const accountId = useSessionStore((s: any) => s.accountId);
  const [characters, setCharacters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!accountId) return;
    fetch(`/api/characters?accountId=${accountId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCharacters(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [accountId]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-[#050b14]">
      <div className="bg-card/40 border border-border/50 backdrop-blur-xl p-8 rounded-xl w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-6 text-center">Select Your Saint</h2>
        
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="loading loading-spinner text-primary" />
          </div>
        ) : characters.length === 0 ? (
          <div className="text-center p-8">
            <p className="text-muted-foreground mb-6">You don't have any characters yet.</p>
            <button 
              className="btn btn-primary"
              onClick={() => useSessionStore.getState().setScene('character_create')}
            >
              Create Character
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {characters.map(char => (
              <div 
                key={char.id}
                className="bg-background/50 border border-border/30 rounded-lg p-4 hover:border-primary/50 cursor-pointer transition-colors"
                onClick={() => {
                  // In Phase 5 we will hook this up to the BootSequence
                  useSessionStore.getState().setCharacter(char.id, char.name);
                  useSessionStore.getState().setScene('login');
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black rounded-full overflow-hidden border border-border">
                    {/* Character avatar placeholder */}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{char.name}</h3>
                    <p className="text-sm text-muted-foreground">Level {char.level || 1} {char.class || 'Rookie'}</p>
                  </div>
                </div>
              </div>
            ))}
            
            <div 
              className="border border-dashed border-border/50 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors opacity-70 hover:opacity-100"
              onClick={() => useSessionStore.getState().setScene('character_create')}
            >
              <div className="text-4xl mb-2">+</div>
              <div>New Character</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
