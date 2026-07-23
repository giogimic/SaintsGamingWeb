'use client';

import React, { useState, useEffect } from 'react';
import { Package, Shield, Scale, Gamepad2, ChevronDown, ChevronUp } from 'lucide-react';
import { ITEM_DB } from '@/components/the-lobby/data/items';
import { getCharacterGtcListings } from '@/app/actions/gtc';

interface ProfileCharacterDetailsProps {
  character: {
    id: string;
    name: string;
    classId: string;
    spriteId: string;
    stateData: string;
  };
}

export function ProfileCharacterDetails({ character }: ProfileCharacterDetailsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'PARTY' | 'GTC'>('INVENTORY');
  const [gtcListings, setGtcListings] = useState<any[]>([]);
  const [loadingGtc, setLoadingGtc] = useState(false);

  useEffect(() => {
    if (activeTab === 'GTC') {
      setLoadingGtc(true);
      getCharacterGtcListings(character.id).then(res => {
        if (res.success && res.listings) {
          setGtcListings(res.listings);
        }
        setLoadingGtc(false);
      });
    }
  }, [activeTab, character.id]);

  let state: any = {};
  try {
    state = JSON.parse(character.stateData || '{}');
  } catch {
    state = {};
  }

  const inventory: Record<string, number> = state.inventory || {};
  const caughtDaemons: string[] = state.caughtDaemons || [];
  const perk = state.perk || 'Standard';
  const credits = state.credits || 0;
  const equipment = state.equipment || {};

  const inventoryEntries = Object.entries(inventory).filter(([_, qty]) => qty > 0);

  return (
    <div className="w-full bg-card/60 border border-border/50 rounded-xl overflow-hidden shadow-sm transition-all hover:border-primary/40">
      {/* Header Bar */}
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="p-4 flex items-center justify-between cursor-pointer select-none bg-muted/20 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-black/60 rounded-lg flex items-center justify-center border border-white/10 shrink-0">
            <Gamepad2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
              <span>{character.name}</span>
              <span className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary border border-primary/30 rounded-full uppercase font-mono">
                {character.classId}
              </span>
            </h3>
            <div className="text-xs text-muted-foreground font-mono flex gap-3 mt-0.5">
              <span>Perk: <strong className="text-emerald-400">{perk.replace('_', ' ')}</strong></span>
              <span>Credits: <strong className="text-amber-400">{credits.toLocaleString()} C</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
            {isOpen ? 'Collapse Details' : 'View Inventory & Party'}
          </span>
          {isOpen ? <ChevronUp className="w-5 h-5 text-primary" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </div>
      </div>

      {/* Expandable Tabs Body */}
      {isOpen && (
        <div className="border-t border-border/40 p-4 space-y-4 bg-background/40 animate-in fade-in duration-200">
          {/* Tab Selection Controls */}
          <div className="flex gap-2 border-b border-border/40 pb-3">
            <button
              onClick={() => setActiveTab('INVENTORY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-colors ${
                activeTab === 'INVENTORY' ? 'bg-primary text-primary-foreground shadow' : 'bg-muted/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Package className="w-3.5 h-3.5" /> Inventory ({inventoryEntries.length})
            </button>
            <button
              onClick={() => setActiveTab('PARTY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-colors ${
                activeTab === 'PARTY' ? 'bg-purple-600 text-white shadow' : 'bg-muted/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Beasts & Bank ({caughtDaemons.length})
            </button>
            <button
              onClick={() => setActiveTab('GTC')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-colors ${
                activeTab === 'GTC' ? 'bg-amber-600 text-white shadow' : 'bg-muted/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Scale className="w-3.5 h-3.5" /> Global Trade Center
            </button>
          </div>

          {/* TAB 1: INVENTORY */}
          {activeTab === 'INVENTORY' && (
            <div className="space-y-3">
              {inventoryEntries.length === 0 ? (
                <div className="text-xs text-muted-foreground italic p-4 text-center border border-dashed rounded-lg">
                  Inventory is empty.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {inventoryEntries.map(([itemId, qty]) => {
                    const itemInfo = ITEM_DB[itemId] || { name: itemId, type: 'ITEM' };
                    const isEquipped = Object.values(equipment).includes(itemId);

                    return (
                      <div key={itemId} className={`p-2.5 bg-black/40 border rounded-lg flex flex-col justify-between ${isEquipped ? 'border-emerald-500/80 bg-emerald-950/20' : 'border-border/50'}`}>
                        <div className="text-[11px] font-bold truncate text-foreground" title={itemInfo.name}>
                          {itemInfo.name}
                        </div>
                        <div className="flex justify-between items-center mt-2 text-[10px] font-mono">
                          {isEquipped ? (
                            <span className="text-emerald-400 font-bold">EQUIPPED</span>
                          ) : (
                            <span className="text-muted-foreground">{itemInfo.type}</span>
                          )}
                          <span className="text-primary font-bold">x{qty}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BEASTS & BANK */}
          {activeTab === 'PARTY' && (
            <div className="space-y-3">
              {caughtDaemons.length === 0 ? (
                <div className="text-xs text-muted-foreground italic p-4 text-center border border-dashed rounded-lg">
                  No Tuxemon beasts bound to this character yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {caughtDaemons.map((daemonId, idx) => (
                    <div key={idx} className="p-3 bg-purple-950/20 border border-purple-800/40 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs text-purple-300 uppercase">BEAST #{daemonId.substring(0, 8)}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">Bound Companion</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-purple-950 text-purple-300 border border-purple-700 rounded font-mono font-bold">
                        ACTIVE
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GLOBAL TRADE CENTER (GTC) */}
          {activeTab === 'GTC' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm px-1">
                <Scale className="w-4 h-4" /> ACTIVE TRADE LISTINGS
              </div>
              
              {loadingGtc ? (
                <div className="text-xs text-muted-foreground italic p-4 text-center border border-dashed border-amber-900/30 rounded-lg">
                  Scanning global trade ledger...
                </div>
              ) : gtcListings.length === 0 ? (
                <div className="text-xs text-muted-foreground italic p-4 text-center border border-dashed border-amber-900/30 rounded-lg bg-amber-950/10">
                  No active trade listings posted. Players can list rare Tuxemon beasts, crafted armor affixes, and raw materials for community trade.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {gtcListings.map((listing, idx) => (
                    <div key={idx} className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div className="font-bold text-xs text-amber-300">{listing.title}</div>
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-950 text-amber-300 border border-amber-700 rounded font-mono font-bold">
                          {listing.itemType}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {listing.affixes || listing.rarity || 'Standard Grade'}
                      </div>
                      <div className="text-xs font-mono font-bold text-amber-500 mt-1 flex justify-between items-center">
                        <span>Price:</span>
                        <span>{listing.price.toLocaleString()} C</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
