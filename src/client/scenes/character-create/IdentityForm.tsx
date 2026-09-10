import React from 'react';
import { ArrowRight, Dice5 } from 'lucide-react';
import { CharacterSpritePreview } from '@/client/ui/shared/CharacterSpritePreview';

interface IdentityFormProps {
  name: string;
  onNameChange: (name: string) => void;
  activeLayers: string[];
  onRandomize: () => void;
  onProceed: () => void;
  presentationMode: string;
}

export function IdentityForm({
  name,
  onNameChange,
  activeLayers,
  onRandomize,
  onProceed,
  presentationMode,
}: IdentityFormProps) {
  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center">
      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-black uppercase font-mono tracking-wider mb-1 text-foreground">
          <span className="sg-text-gradient">Hero Identity</span>
        </h2>
        <p className="text-muted-foreground text-xs font-mono tracking-wide">
          Assign a unique character name for your hero in the realm
        </p>
      </div>

      {/* Avatar Preview */}
      <div className="w-24 h-24 rounded-2xl bg-black/80 border-2 border-primary/60 flex items-center justify-center mb-6 shadow-[0_0_25px_rgba(234,179,8,0.2)]">
        <CharacterSpritePreview layers={activeLayers} size={32} scale={2.2} />
      </div>

      {/* Input Form */}
      <div className="w-full bg-[#050b14]/95 border border-border/50 rounded-2xl p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-4">
        <label className="text-xs font-mono font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
          <span>Character Name</span>
          <span className="text-[10px] text-muted-foreground">Min 3 characters</span>
        </label>

        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Enter Character Name..."
            maxLength={18}
            autoFocus
            className="flex-1 px-4 py-3 rounded-xl bg-card/60 border border-border/60 text-foreground placeholder:text-muted-foreground font-mono text-base focus:outline-none focus:border-primary shadow-inner"
          />
          <button
            type="button"
            onClick={onRandomize}
            className="px-4 py-3 rounded-xl bg-card hover:bg-card/80 border border-border text-foreground transition-all cursor-pointer flex items-center gap-1.5 font-mono text-xs font-bold"
            title="Generate Random Name"
          >
            <Dice5 size={16} />
            Random
          </button>
        </div>

        <div className="flex justify-end mt-4">
          <button
            disabled={!name || name.trim().length < 3}
            onClick={onProceed}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-mono font-bold text-xs uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(234,179,8,0.25)] disabled:opacity-40 cursor-pointer transition-all"
          >
            {presentationMode === 'modular' ? 'Proceed to Avatar' : 'Proceed to Perk'} <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
