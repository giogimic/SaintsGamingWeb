'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Package, Shield, Scale, Gamepad2, ChevronDown, ChevronUp, ShoppingCart } from 'lucide-react';
import { ITEM_DB } from '@/web/components/the-lobby/data/items';
import {
  getCharacterGtcListings,
  getLiveGtcListings,
  getUserInventory,
  purchaseGtcListing,
} from '@/app/actions/gtc';
import { toast } from 'sonner';

interface ProfileCharacterDetailsProps {
  character: {
    id: string;
    name: string;
    classId: string;
    spriteId: string;
    stateData?: string;
  };
  /** Owner user id — inventory is keyed by User, not character */
  userId: string;
  /** When true, show live marketplace + Buy (async web bridge) */
  isSelf?: boolean;
}

export function ProfileCharacterDetails({
  character,
  userId,
  isSelf = false,
}: ProfileCharacterDetailsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'PARTY' | 'GTC'>('INVENTORY');
  const [gtcListings, setGtcListings] = useState<any[]>([]);
  const [liveListings, setLiveListings] = useState<any[]>([]);
  const [loadingGtc, setLoadingGtc] = useState(false);
  const [inventoryEntries, setInventoryEntries] = useState<[string, number][]>([]);
  const [loadingInv, setLoadingInv] = useState(false);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  let state: any = {};
  try {
    state = JSON.parse(character.stateData || '{}');
  } catch {
    state = {};
  }

  const caughtDaemons: string[] = state.caughtDaemons || [];
  const perk = state.perk || 'Standard';
  const [credits, setCredits] = useState<number>(state.credits || 0);
  const equipment = state.equipment || {};

  const loadInventory = useCallback(async () => {
    setLoadingInv(true);
    const res = await getUserInventory(userId);
    if (res.success && res.items) {
      setInventoryEntries(
        res.items
          .filter((i) => i.quantity > 0)
          .map((i) => [i.itemSlug, i.quantity] as [string, number])
      );
    }
    setLoadingInv(false);
  }, [userId]);

  useEffect(() => {
    if (isOpen && activeTab === 'INVENTORY') {
      void loadInventory();
    }
  }, [isOpen, activeTab, loadInventory]);

  useEffect(() => {
    if (activeTab !== 'GTC') return;
    setLoadingGtc(true);
    void (async () => {
      const mine = await getCharacterGtcListings(character.id);
      if (mine.success && mine.listings) setGtcListings(mine.listings);
      if (isSelf) {
        const live = await getLiveGtcListings('MATERIAL');
        if (live.success && live.listings) setLiveListings(live.listings);
      }
      setLoadingGtc(false);
    })();
  }, [activeTab, character.id, isSelf]);

  const handleBuy = async (listingId: string) => {
    setBuyingId(listingId);
    const res = await purchaseGtcListing(listingId);
    setBuyingId(null);
    if (!res.success) {
      toast.error(res.error || 'Purchase failed');
      return;
    }
    toast.success(`Purchased ${res.title} — in inventory on serapht lobby join`);
    if (typeof res.buyerCredits === 'number') setCredits(res.buyerCredits);
    setLiveListings((prev) => prev.filter((l) => l.id !== listingId));
    void loadInventory();
  };

  return (
    <div className="w-full bg-card/60 border border-border/50 rounded-xl overflow-hidden shadow-sm transition-all hover:border-primary/40">
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
              <span>
                Perk: <strong className="text-emerald-400">{perk.replace('_', ' ')}</strong>
              </span>
              <span>
                Credits: <strong className="text-amber-400">{credits.toLocaleString()} C</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
            {isOpen ? 'Collapse Details' : 'View Inventory & Party'}
          </span>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-primary" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-border/40 p-4 space-y-4 bg-background/40 animate-in fade-in duration-200">
          <div className="flex gap-2 border-b border-border/40 pb-3 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('INVENTORY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-colors ${
                activeTab === 'INVENTORY'
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'bg-muted/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Package className="w-3.5 h-3.5" /> Inventory ({inventoryEntries.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PARTY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-colors ${
                activeTab === 'PARTY'
                  ? 'bg-purple-600 text-white shadow'
                  : 'bg-muted/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Beasts & Bank ({caughtDaemons.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('GTC')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-colors ${
                activeTab === 'GTC'
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-muted/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Scale className="w-3.5 h-3.5" /> Global Trade Center
            </button>
          </div>

          {activeTab === 'INVENTORY' && (
            <div className="space-y-3">
              <p className="text-[10px] text-muted-foreground font-mono">
                Cold inventory (`PlayerInventoryItem`) — same bag the lobby loads on join.
              </p>
              {loadingInv ? (
                <div className="text-xs text-muted-foreground italic p-4 text-center border border-dashed rounded-lg">
                  Loading inventory…
                </div>
              ) : inventoryEntries.length === 0 ? (
                <div className="text-xs text-muted-foreground italic p-4 text-center border border-dashed rounded-lg">
                  Inventory is empty.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {inventoryEntries.map(([itemId, qty]) => {
                    const itemInfo = ITEM_DB[itemId] || { name: itemId, type: 'ITEM' };
                    const isEquipped = Object.values(equipment).includes(itemId);

                    return (
                      <div
                        key={itemId}
                        className={`p-2.5 bg-black/40 border rounded-lg flex flex-col justify-between ${
                          isEquipped
                            ? 'border-emerald-500/80 bg-emerald-950/20'
                            : 'border-border/50'
                        }`}
                      >
                        <div
                          className="text-[11px] font-bold truncate text-foreground"
                          title={itemInfo.name}
                        >
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

          {activeTab === 'PARTY' && (
            <div className="space-y-3">
              {caughtDaemons.length === 0 ? (
                <div className="text-xs text-muted-foreground italic p-4 text-center border border-dashed rounded-lg">
                  No Creature beasts bound to this character yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {caughtDaemons.map((daemonId, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-purple-950/20 border border-purple-800/40 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-xs text-purple-300 uppercase">
                          BEAST #{daemonId.substring(0, 8)}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Bound Companion
                        </div>
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

          {activeTab === 'GTC' && (
            <div className="space-y-4">
              {isSelf && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm px-1">
                    <ShoppingCart className="w-4 h-4" /> LIVE MARKETPLACE (async web buy)
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono px-1">
                    Buy on the website — item lands in cold inventory; lobby picks it up on join.
                  </p>
                  {loadingGtc ? (
                    <div className="text-xs text-muted-foreground italic p-4 text-center border border-dashed border-amber-900/30 rounded-lg">
                      Scanning global trade ledger…
                    </div>
                  ) : liveListings.filter((l) => l.sellerId !== character.id).length === 0 ? (
                    <div className="text-xs text-muted-foreground italic p-4 text-center border border-dashed border-amber-900/30 rounded-lg bg-amber-950/10">
                      No MATERIAL listings for sale right now.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {liveListings
                        .filter((l) => l.sellerId !== character.id)
                        .map((listing) => (
                          <div
                            key={listing.id}
                            className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg flex flex-col gap-2"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="font-bold text-xs text-amber-300">{listing.title}</div>
                              <span className="text-[10px] px-1.5 py-0.5 bg-amber-950 text-amber-300 border border-amber-700 rounded font-mono font-bold shrink-0">
                                {listing.itemType}
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Seller: {listing.sellerName || '—'} · {listing.itemId}
                            </div>
                            <div className="flex justify-between items-center gap-2 mt-auto">
                              <span className="text-xs font-mono font-bold text-amber-500">
                                {listing.price.toLocaleString()} C
                              </span>
                              <button
                                type="button"
                                disabled={buyingId === listing.id}
                                onClick={() => void handleBuy(listing.id)}
                                className="text-[10px] px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold disabled:opacity-50 cursor-pointer"
                              >
                                {buyingId === listing.id ? '…' : 'Buy'}
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm px-1">
                  <Scale className="w-4 h-4" /> THIS CHARACTER&apos;S LISTINGS
                </div>
                {loadingGtc ? null : gtcListings.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic p-4 text-center border border-dashed border-amber-900/30 rounded-lg bg-amber-950/10">
                    No active trade listings posted by this character.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {gtcListings.map((listing) => (
                      <div
                        key={listing.id}
                        className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg flex flex-col gap-2"
                      >
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
