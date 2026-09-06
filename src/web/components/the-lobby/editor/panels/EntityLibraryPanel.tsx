import React, { useState } from 'react';
import { useEditorStore } from '../editor-store';
import { ENTITY_SCHEMAS, EntitySchemaKind } from '@/shared/game/entitySchemas';
import SpriteBrowser from '../SpriteBrowser';
import { useGameStore } from '../../store';

export const EntityLibraryPanel: React.FC = () => {
  const setPendingEntityPlacement = useEditorStore((s) => s.setPendingEntityPlacement);
  const showToast = useGameStore((s: any) => s.showToast);

  const [activeKind, setActiveKind] = useState<EntitySchemaKind>('npc');

  const handleSpriteSelect = (assets: any[]) => {
    const asset = assets[0];
    if (!asset) return;
    
    // Extract asset profile ID from source
    const src = asset.source || '';
    const m = src.match(/\/game-assets\/[^/]+\/([^/]+?)(?:\.png)?(?:$|\?)/i);
    const assetProfileId = m ? m[1] : asset.id;

    setPendingEntityPlacement({ kind: activeKind, assetProfileId });
    showToast(`Click the canvas to place ${ENTITY_SCHEMAS[activeKind].label}`);
  };

  const schema = ENTITY_SCHEMAS[activeKind];

  return (
    <div className="flex flex-col h-full bg-[#050b14] text-slate-300">
      <div className="flex border-b border-border/30 overflow-x-auto shrink-0 scrollbar-hide">
        {(Object.keys(ENTITY_SCHEMAS) as EntitySchemaKind[]).map((kind) => {
          const s = ENTITY_SCHEMAS[kind];
          return (
            <button
              key={kind}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                activeKind === kind
                  ? 'bg-primary/20 text-primary border-b-2 border-primary'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
              onClick={() => setActiveKind(kind)}
            >
              {s.label}
            </button>
          );
        })}
      </div>
      
      <div className="p-3 bg-black/40 border-b border-border/30 shrink-0">
        <h3 className="font-sans font-bold text-lg text-slate-100">{schema.label} Library</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
          {schema.description} Select an asset below, then click on the map to place it.
        </p>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <SpriteBrowser
          filterTags={activeKind === 'npc' || activeKind === 'monster' ? ['npc'] : undefined}
          filterType={activeKind === 'npc' || activeKind === 'monster' ? 'CHARACTER' : undefined}
          onSelect={handleSpriteSelect}
        />
      </div>
    </div>
  );
};
