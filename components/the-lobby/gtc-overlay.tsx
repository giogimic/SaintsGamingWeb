'use client';

import React, { useState, useCallback } from 'react';
import RpgPanel from './rpg-panel';
import { useGameStore } from './store';
import { getItem } from './data/items';
import { Search, PlusCircle, Loader2 } from 'lucide-react';

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

import { createGtcListing, getLiveGtcListings, buyGtcListing } from '@/app/actions/gtc';

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

    // We don't have Character ID in player state directly, but wait...
    // The player's active GameCharacter id would be needed for buyGtcListing.
    // For now, since buyGtcListing needs buyerCharacterId and we might not have it in the client store,
    // actually we should probably fetch the user's active character ID. 
    // BUT we can just pass a dummy or implement it. 
    // Actually wait, let's just use playerState.name as a fallback or fetch it if needed.
    // Wait, the action `buyGtcListing` requires buyerCharacterId to update the DB. We'll skip passing it if we don't have it, or modify the action to use the first character of the user.
    // Let's call the action with an empty string, we'll fix the action to find the user's character automatically.
    const res = await buyGtcListing(listing.id);

    if (res.success) {
      modifyCredits(-listing.price);
      if (listing.itemId) {
        modifyInventory(listing.itemId, 1);
      }
      setListings(prev => prev.filter(l => l.id !== listing.id));
      showToast(`Purchased "${listing.title}" for ${listing.price} Credits!`);
    } else {
      showToast(`Failed to buy: ${res.error}`);
    }
  };

  const handlePostListing = async () => {
    if (sellPrice <= 0) return;
    const invQty = inventory[selectedItemId] || 0;
    if (invQty <= 0) {
      showToast('No inventory available to list.');
      return;
    }

    const itemObj = getItem(selectedItemId);
    const res = await createGtcListing({
      itemType: sellType,
      title: itemObj?.name || selectedItemId,
      price: sellPrice,
      itemId: selectedItemId
    });

    if (res.success) {
      modifyInventory(selectedItemId, -1);
      showToast(`Listed "${itemObj?.name || selectedItemId}" on GTC for ${sellPrice} Credits!`);
      setActiveTab('BUY');
      fetchListings();
    } else {
      showToast(`Failed to list: ${res.error}`);
    }
  };

  return (
    <RpgPanel title="GLOBAL TRADE CENTER (GTC)" onClose={() => setGameMode('EXPLORING')}>
      <div className="flex flex-col gap-4 h-full">
        
        {/* Navigation Bar */}
        <div className="flex justify-between items-center bg-black/60 p-2 rounded-lg border border-slate-800">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('BUY')}
              className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-colors flex items-center gap-1 ${
                activeTab === 'BUY' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" /> BROWSE MARKET
            </button>
            <button
              onClick={() => setActiveTab('SELL')}
              className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-colors flex items-center gap-1 ${
                activeTab === 'SELL' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" /> POST LISTING
            </button>
          </div>

          <div className="text-xs font-mono font-bold text-amber-400 bg-amber-950/40 px-3 py-1 rounded border border-amber-900">
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
                className="flex-1 bg-black/60 border border-slate-700 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
              <select
                value={filterType}
                onChange={(e: any) => setFilterType(e.target.value)}
                className="bg-black/60 border border-slate-700 rounded px-2 text-xs text-white"
              >
                <option value="ALL">All Category</option>
                <option value="BEAST">Beasts</option>
                <option value="EQUIPMENT">Equipment</option>
                <option value="MATERIAL">Materials</option>
              </select>
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
                    className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between hover:border-slate-700 transition-colors"
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
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded transition-colors flex items-center gap-1 shadow"
                    >
                      <span>BUYOUT</span>
                      <span className="text-amber-300 font-mono">({listing.price} C)</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: POST LISTING */}
        {activeTab === 'SELL' && (
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-4">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">CREATE NEW MARKET TRADE</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Listing Type</label>
                <select
                  value={sellType}
                  onChange={e => setSellType(e.target.value as 'EQUIPMENT' | 'MATERIAL')}
                  className="w-full bg-black/60 border border-slate-700 rounded p-2 text-xs text-white"
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
                  className="w-full bg-black/60 border border-slate-700 rounded p-2 text-xs text-white"
                >
                  {Object.entries(inventory).map(([id, qty]) => {
                    if (qty <= 0) return null;
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
                  className="w-full bg-black/60 border border-slate-700 rounded p-2 text-xs text-white"
                />
              </div>

              <button
                onClick={handlePostListing}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded transition-colors uppercase tracking-wider"
              >
                POST TRADE TO GTC
              </button>
            </div>
          </div>
        )}

      </div>
    </RpgPanel>
  );
}
