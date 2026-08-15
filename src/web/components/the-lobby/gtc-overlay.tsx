'use client';

import React, { useState, useCallback, useEffect } from 'react';
import RpgPanel from './rpg-panel';
import { useGameStore } from './store';
import { getItem } from './data/items';
import { soundSynth } from '@/engine/sound-synth';
import { getLiveGtcListings } from '@/app/actions/gtc';
import { Search, PlusCircle, Loader2, RefreshCw, ShoppingCart, Tag, Coins, ArrowRightLeft } from 'lucide-react';

interface TradeListing {
  id: string;
  sellerName: string;
  itemType: 'BEAST' | 'EQUIPMENT' | 'MATERIAL';
  title: string;
  price: number;
  rarity?: string;
  affixes?: string;
  itemId?: string;
}

export default function GtcOverlay() {
  const [activeTab, setActiveTab] = useState<'BUY' | 'SELL'>('BUY');
  const [listings, setListings] = useState<TradeListing[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'BEAST' | 'EQUIPMENT' | 'MATERIAL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Sell form state
  const [sellType, setSellType] = useState<'EQUIPMENT' | 'MATERIAL'>('MATERIAL');
  const [selectedItemId, setSelectedItemId] = useState<string>('wood_logs');
  const [sellPrice, setSellPrice] = useState<number>(250);

  const playerState = useGameStore(state => state.player);
  const credits = playerState.credits;
  const inventory = playerState.inventory;
  const setGameMode = useGameStore(state => state.setGameMode);
  const showToast = useGameStore(state => state.showToast);
  const emitSocketEvent = useGameStore(state => state.emitSocketEvent);

  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    const res = await getLiveGtcListings(filterType);
    if (res?.success && res?.listings) {
      setListings(res.listings as TradeListing[]);
    }
    setIsLoading(false);
  }, [filterType]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    const handleTransactionSuccess = (e: CustomEvent) => {
      const { type } = e.detail || {};
      if (type === 'LIST_CREATED') {
        setActiveTab('BUY');
        fetchListings();
      } else if (type === 'PURCHASE_COMPLETE') {
        fetchListings();
      }
    };
    
    window.addEventListener('gtc_transaction_success' as any, handleTransactionSuccess);
    return () => window.removeEventListener('gtc_transaction_success' as any, handleTransactionSuccess);
  }, [fetchListings]);

  const filteredListings = listings.filter(l => {
    const matchesSearch = l.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          l.sellerName.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterType !== 'ALL') return matchesSearch && l.itemType === filterType;
    return matchesSearch;
  });

  const handleBuyout = async (listing: TradeListing) => {
    soundSynth?.playSelectSound?.();
    if (credits < listing.price) {
      showToast(`Requires ${listing.price.toLocaleString()} Credits!`);
      return;
    }

    soundSynth?.playActionSound?.();
    emitSocketEvent?.('gtc_purchase_listing', { listingId: listing.id });
    showToast(`Purchased ${listing.title} for ${listing.price.toLocaleString()} Credits!`);
  };

  const handlePostListing = async () => {
    if (sellPrice <= 0) return;
    const invQty = inventory[selectedItemId] || 0;
    if (invQty <= 0) {
      showToast('No inventory available to list.');
      return;
    }

    soundSynth?.playActionSound?.();
    const itemObj = getItem(selectedItemId);
    
    emitSocketEvent?.('gtc_create_listing', {
      itemType: sellType,
      title: itemObj?.name || selectedItemId,
      price: sellPrice,
      itemId: selectedItemId
    });
    showToast(`Posting ${itemObj?.name || selectedItemId} for ${sellPrice.toLocaleString()} Credits...`);
  };

  const sellableItems = Object.entries(inventory).filter(([_, qty]) => qty > 0);

  useEffect(() => {
    if (sellableItems.length > 0 && !inventory[selectedItemId]) {
      setSelectedItemId(sellableItems[0][0]);
    }
  }, [inventory, selectedItemId, sellableItems]);

  const taxAmount = Math.floor(sellPrice * 0.05);
  const netEarnings = Math.max(0, sellPrice - taxAmount);

  return (
    <RpgPanel 
      title="GRAND TRADE CENTER (GTC)" 
      icon={<ArrowRightLeft className="w-4 h-4 text-amber-400" />}
      onClose={() => setGameMode('EXPLORING')}
    >
      <div className="flex flex-col gap-3 h-full font-mono text-xs">
        
        {/* Navigation & Balance Bar */}
        <div className="flex flex-wrap justify-between items-center bg-black/50 p-2 rounded-xl border border-amber-500/30 gap-2">
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                soundSynth?.playSelectSound?.();
                setActiveTab('BUY');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'BUY' 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]' 
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <Search className="w-3.5 h-3.5" /> BROWSE EXCHANGE
            </button>
            <button
              onClick={() => {
                soundSynth?.playSelectSound?.();
                setActiveTab('SELL');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'SELL' 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]' 
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" /> CREATE LISTING
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-950/40 px-3 py-1 rounded-lg border border-amber-500/40">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>{credits.toLocaleString()} CREDITS</span>
          </div>
        </div>

        {/* TAB 1: BROWSE MARKET */}
        {activeTab === 'BUY' && (
          <div className="flex-1 flex flex-col gap-2.5 overflow-hidden">
            {/* Search & Filter Controls */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search market listings..."
                  className="w-full bg-black/60 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 placeholder:text-slate-500"
                />
              </div>

              <select
                value={filterType}
                onChange={(e: any) => setFilterType(e.target.value)}
                className="bg-black/60 border border-slate-800 rounded-lg px-2.5 text-xs text-amber-200 focus:outline-none focus:border-amber-400"
              >
                <option value="ALL">All Categories</option>
                <option value="BEAST">Beasts & Crystals</option>
                <option value="EQUIPMENT">Equipment & Weapons</option>
                <option value="MATERIAL">Trade Materials</option>
              </select>

              <button
                onClick={() => {
                  soundSynth?.playSelectSound?.();
                  fetchListings();
                }}
                disabled={isLoading}
                title="Refresh market listings"
                className="px-3 py-1.5 bg-black/60 hover:bg-slate-900 text-amber-400 rounded-lg border border-slate-800 hover:border-amber-500/40 transition-colors disabled:opacity-50 flex items-center justify-center cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Trade Listing Feed */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {isLoading ? (
                <div className="text-slate-400 text-xs italic text-center p-8 border border-dashed border-slate-800 rounded-xl flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> Connecting to Global Trade Network...
                </div>
              ) : filteredListings.length === 0 ? (
                <div className="text-slate-400 text-xs italic text-center p-8 border border-dashed border-slate-800 rounded-xl">
                  No active trade listings found matching current filters.
                </div>
              ) : (
                filteredListings.map(listing => (
                  <div
                    key={listing.id}
                    className="p-3 bg-black/40 border border-slate-800/80 rounded-xl flex items-center justify-between hover:border-amber-500/50 hover:bg-amber-950/10 transition-all shadow-sm"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{listing.title}</span>
                        {listing.rarity && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-purple-950/80 text-purple-300 border border-purple-500/40">
                            {listing.rarity}
                          </span>
                        )}
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 uppercase">
                          {listing.itemType}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Seller: <span className="text-cyan-400 font-semibold">{listing.sellerName}</span>
                      </div>
                      {listing.affixes && (
                        <div className="text-[10px] text-emerald-400 font-bold">{listing.affixes}</div>
                      )}
                    </div>

                    <button
                      onClick={() => handleBuyout(listing)}
                      className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/40 text-amber-200 hover:text-amber-100 font-bold text-xs rounded-lg transition-all border border-amber-400/50 flex items-center gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.15)] active:scale-95 cursor-pointer"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>BUYOUT</span>
                      <span className="text-amber-300 font-mono">({listing.price.toLocaleString()} C)</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CREATE LISTING */}
        {activeTab === 'SELL' && (
          <div className="p-4 bg-black/40 border border-slate-800 rounded-xl space-y-4">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <Tag className="w-4 h-4" />
              CREATE NEW MARKET LISTING
            </h3>
            
            {sellableItems.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center text-slate-400 italic text-xs">
                You do not have any tradeable items or materials in your backpack.
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Category</label>
                  <select
                    value={sellType}
                    onChange={e => setSellType(e.target.value as 'EQUIPMENT' | 'MATERIAL')}
                    className="w-full bg-black/60 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="MATERIAL">Trade Material</option>
                    <option value="EQUIPMENT">Equipment & Weapon</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Select Item from Inventory</label>
                  <select
                    value={selectedItemId}
                    onChange={e => setSelectedItemId(e.target.value)}
                    className="w-full bg-black/60 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    {sellableItems.map(([id, qty]) => {
                      const info = getItem(id);
                      return (
                        <option key={id} value={id}>
                          {info?.name || id} (In Bag: x{qty})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Listing Price (Credits)</label>
                  <input
                    type="number"
                    min={10}
                    step={50}
                    value={sellPrice}
                    onChange={e => setSellPrice(parseInt(e.target.value) || 0)}
                    className="w-full bg-black/60 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Exchange Fee (5%): <strong className="text-rose-400">-{taxAmount.toLocaleString()} C</strong></span>
                    <span>Net Proceeds: <strong className="text-emerald-400">{netEarnings.toLocaleString()} C</strong></span>
                  </div>
                </div>

                <button
                  onClick={handlePostListing}
                  disabled={sellableItems.length === 0 || sellPrice <= 0}
                  className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-black font-black text-xs rounded-xl transition-all uppercase tracking-wider cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.3)] active:scale-95"
                >
                  PUBLISH TRADE LISTING
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </RpgPanel>
  );
}

