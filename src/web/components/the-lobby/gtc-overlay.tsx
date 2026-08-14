'use client';

import React, { useState, useCallback, useEffect } from 'react';
import RpgPanel from './rpg-panel';
import { useGameStore } from './store';
import { getItem } from './data/items';
import { Search, PlusCircle, Loader2, RefreshCw } from 'lucide-react';

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
import { getLiveGtcListings } from '@/app/actions/gtc';

export default function GtcOverlay() {
  const [activeTab, setActiveTab] = useState<'BUY' | 'SELL' | 'MY_LISTINGS'>('BUY');
  const [listings, setListings] = useState<TradeListing[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'BEAST' | 'EQUIPMENT' | 'MATERIAL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    const res = await getLiveGtcListings(filterType);
    if (res.success && res.listings) {
      setListings(res.listings as TradeListing[]);
    }
    setIsLoading(false);
  }, [filterType]);

  React.useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Sell form state
  const [sellType, setSellType] = useState<'EQUIPMENT' | 'MATERIAL'>('MATERIAL');
  const [selectedItemId, setSelectedItemId] = useState<string>('wood_logs');
  const [sellPrice, setSellPrice] = useState<number>(250);

  const playerState = useGameStore(state => state.player);
  const credits = playerState.credits;
  const inventory = playerState.inventory;
  const modifyCredits = useGameStore(state => state.modifyCredits);
  const modifyInventory = useGameStore(state => state.modifyInventory);
  const setGameMode = useGameStore(state => state.setGameMode);
  const showToast = useGameStore(state => state.showToast);

  const emitSocketEvent = useGameStore(state => state.emitSocketEvent);

  useEffect(() => {
    fetchListings();
    
    const handleTransactionSuccess = (e: CustomEvent) => {
      const { type } = e.detail;
      if (type === 'LIST_CREATED') {
        setActiveTab('BUY');
        fetchListings();
      } else if (type === 'PURCHASE_COMPLETE') {
        fetchListings();
      }
    };
    
    window.addEventListener('gtc_transaction_success' as any, handleTransactionSuccess);
    return () => window.removeEventListener('gtc_transaction_success' as any, handleTransactionSuccess);
  }, []);

  const filteredListings = listings.filter(l => {
    const matchesSearch = l.title.toLowerCase().includes(searchTerm.toLowerCase()) || l.sellerName.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterType !== 'ALL') return matchesSearch && l.itemType === filterType;
    return matchesSearch;
  });

  const handleBuyout = async (listing: TradeListing) => {
    if (credits < listing.price) {
      showToast(`Requires ${listing.price} Credits!`);
      return;
    }

    emitSocketEvent?.('gtc_purchase_listing', { listingId: listing.id });
  };

  const handlePostListing = async () => {
    if (sellPrice <= 0) return;
    const invQty = inventory[selectedItemId] || 0;
    if (invQty <= 0) {
      showToast('No inventory available to list.');
      return;
    }

    const itemObj = getItem(selectedItemId);
    
    emitSocketEvent?.('gtc_create_listing', {
      itemType: sellType,
      title: itemObj?.name || selectedItemId,
      price: sellPrice,
      itemId: selectedItemId
    });
    showToast(`Posting ${itemObj?.name || selectedItemId} for ${sellPrice} Credits...`);
  };

  const sellableItems = Object.entries(inventory).filter(([_, qty]) => qty > 0);

  // Keep selected item valid
  React.useEffect(() => {
    if (sellableItems.length > 0 && !inventory[selectedItemId]) {
      setSelectedItemId(sellableItems[0][0]);
    }
  }, [inventory, selectedItemId, sellableItems]);

  return (
    <RpgPanel title="GLOBAL TRADE CENTER (GTC)" onClose={() => setGameMode('EXPLORING')}>
      <div className="flex flex-col gap-4 h-full">
        
        {/* Navigation Bar */}
        <div className="flex justify-between items-center bg-[#050b14]/60 p-2 rounded-lg border border-[#806f47]/50">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('BUY')}
              className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-colors flex items-center gap-1 ${
                activeTab === 'BUY' ? 'bg-[#806f47]/80 text-[#e2d5b3] border border-[#cbb26a]' : 'text-[#806f47] hover:text-[#e2d5b3] border border-transparent'
              }`}
            >
              <Search className="w-3.5 h-3.5" /> BROWSE MARKET
            </button>
            <button
              onClick={() => setActiveTab('SELL')}
              className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-colors flex items-center gap-1 ${
                activeTab === 'SELL' ? 'bg-[#806f47]/80 text-[#e2d5b3] border border-[#cbb26a]' : 'text-[#806f47] hover:text-[#e2d5b3] border border-transparent'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" /> POST LISTING
            </button>
          </div>

          <div className="text-xs font-mono font-bold text-[#eab308] bg-[#806f47]/20 px-3 py-1 rounded border border-[#806f47]/50">
            BALANCE: {credits.toLocaleString()} C
          </div>
        </div>

        {/* TAB 1: BROWSE MARKET */}
        {activeTab === 'BUY' && (
          <div className="flex-1 flex flex-col gap-3 overflow-hidden">
            {/* Search & Filter Controls */}
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search trades by name or seller..."
                className="flex-1 bg-[#050b14]/80 border border-[#806f47]/40 rounded px-3 py-1.5 text-xs text-[#e2d5b3] focus:outline-none focus:border-[#cbb26a]"
              />
              <select
                value={filterType}
                onChange={(e: any) => setFilterType(e.target.value)}
                className="bg-[#050b14]/80 border border-[#806f47]/40 rounded px-2 text-xs text-[#e2d5b3]"
              >
                <option value="ALL">All Category</option>
                <option value="BEAST">Beasts</option>
                <option value="EQUIPMENT">Equipment</option>
                <option value="MATERIAL">Materials</option>
              </select>
              <button
                onClick={() => fetchListings()}
                disabled={isLoading}
                title="Refresh market listings"
                className="px-2.5 py-1.5 bg-[#1a2333] hover:bg-[#253247] text-[#cbb26a] rounded border border-[#806f47]/40 transition-colors disabled:opacity-50 flex items-center justify-center cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Trade Grid */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {isLoading ? (
                <div className="text-slate-400 text-xs italic text-center p-8 border border-dashed rounded flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading market listings...
                </div>
              ) : filteredListings.length === 0 ? (
                <div className="text-slate-400 text-xs italic text-center p-8 border border-dashed rounded">
                  No active trade listings found.
                </div>
              ) : (
                filteredListings.map(listing => (
                  <div
                    key={listing.id}
                    className="p-3 bg-[#0b1320]/60 border border-[#806f47]/40 rounded-lg flex items-center justify-between hover:border-[#cbb26a] transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-200">{listing.title}</span>
                        {listing.rarity && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                            {listing.rarity}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Seller: <span className="text-cyan-400 font-semibold">{listing.sellerName}</span> | Category: {listing.itemType}
                      </div>
                      {listing.affixes && (
                        <div className="text-[10px] text-emerald-400 font-mono">{listing.affixes}</div>
                      )}
                    </div>

                    <button
                      onClick={() => handleBuyout(listing)}
                      className="px-4 py-2 bg-[#806f47] hover:bg-[#cbb26a] text-white font-bold text-xs rounded transition-colors flex items-center gap-1 shadow cursor-pointer"
                    >
                      <span>BUYOUT</span>
                      <span className="text-[#050b14] font-mono">({listing.price} C)</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: POST LISTING */}
        {activeTab === 'SELL' && (
          <div className="p-4 bg-[#0b1320]/60 border border-[#806f47]/40 rounded-lg space-y-4">
            <h3 className="text-xs font-bold text-[#eab308] uppercase tracking-wider">CREATE NEW MARKET TRADE</h3>
            
            {sellableItems.length === 0 ? (
              <div className="p-8 border border-dashed rounded text-center text-slate-400 italic text-xs">
                You do not have any tradeable items or materials in your backpack.
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Listing Type</label>
                  <select
                    value={sellType}
                    onChange={e => setSellType(e.target.value as 'EQUIPMENT' | 'MATERIAL')}
                    className="w-full bg-[#050b14]/80 border border-[#806f47]/40 rounded p-2 text-xs text-[#e2d5b3]"
                  >
                    <option value="MATERIAL">Material</option>
                    <option value="EQUIPMENT">Equipment</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1">Select Item from Inventory</label>
                  <select
                    value={selectedItemId}
                    onChange={e => setSelectedItemId(e.target.value)}
                    className="w-full bg-[#050b14]/80 border border-[#806f47]/40 rounded p-2 text-xs text-[#e2d5b3]"
                  >
                    {sellableItems.map(([id, qty]) => {
                      const info = getItem(id);
                      return (
                        <option key={id} value={id}>
                          {info?.name || id} (Owned: x{qty})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1">Listing Price (Credits)</label>
                  <input
                    type="number"
                    min={10}
                    step={50}
                    value={sellPrice}
                    onChange={e => setSellPrice(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#050b14]/80 border border-[#806f47]/40 rounded p-2 text-xs text-[#e2d5b3]"
                  />
                </div>

                <button
                  onClick={handlePostListing}
                  disabled={sellableItems.length === 0 || sellPrice <= 0}
                  className="w-full py-2.5 bg-[#806f47] hover:bg-[#cbb26a] disabled:opacity-50 text-white font-bold text-xs rounded transition-colors uppercase tracking-wider cursor-pointer"
                >
                  POST TRADE TO GTC
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </RpgPanel>
  );
}
