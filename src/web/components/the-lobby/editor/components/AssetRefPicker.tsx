'use client';

import React, { useState, useEffect } from 'react';
import { ImageIcon, Search, X, Check, Eye } from 'lucide-react';
import { listUsableAssets } from '@/app/actions/assets';
import type { UsableAsset } from '@prisma/client';

interface AssetRefPickerProps {
  /** The currently selected asset ID or asset URL / slug. */
  value?: string;
  /** Callback fired when an asset is selected or cleared. */
  onChange: (assetId: string | undefined, asset?: UsableAsset) => void;
  /** Filter the browser by asset type (e.g. CHARACTER, CREATURE, ITEM, OBJECT, EFFECT, MODEL). */
  assetType?: string;
  /** Optional field label. */
  label?: string;
  /** Placeholder text. */
  placeholder?: string;
}

export const AssetRefPicker: React.FC<AssetRefPickerProps> = ({
  value,
  onChange,
  assetType,
  label = 'Asset Reference',
  placeholder = 'Select an asset...',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assets, setAssets] = useState<UsableAsset[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<UsableAsset | null>(null);

  useEffect(() => {
    if (!isModalOpen) return;
    let active = true;
    setLoading(true);
    listUsableAssets({ type: assetType, query: search }).then((res) => {
      if (active) {
        if (res.success && res.data) {
          setAssets(res.data);
        }
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [isModalOpen, search, assetType]);

  const handleSelect = (asset: UsableAsset) => {
    setSelectedAsset(asset);
    onChange(asset.id, asset);
    setIsModalOpen(false);
  };

  const handleClear = () => {
    setSelectedAsset(null);
    onChange(undefined, undefined);
  };

  return (
    <div className="space-y-1">
      {label && (
        <label className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
          <span>{label}</span>
          {assetType && <span className="text-[9px] uppercase px-1 rounded bg-slate-800 text-slate-400">{assetType}</span>}
        </label>
      )}

      <div className="flex items-center gap-2">
        {/* Preview thumbnail or icon */}
        <div className="w-9 h-9 rounded bg-black/60 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
          {selectedAsset?.thumbnailPath || selectedAsset?.cdnUrl ? (
            <img
              src={selectedAsset.thumbnailPath || selectedAsset.cdnUrl!}
              alt={selectedAsset.name}
              className="w-full h-full object-contain pixelated"
            />
          ) : (
            <ImageIcon className="w-4 h-4 text-slate-600" />
          )}
        </div>

        {/* Input / display box */}
        <div
          onClick={() => setIsModalOpen(true)}
          className="flex-1 rounded bg-black/50 px-2.5 py-1.5 border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between text-xs text-slate-200 transition-colors"
        >
          <span className={value ? 'text-slate-200 font-mono' : 'text-slate-500'}>
            {selectedAsset?.name || value || placeholder}
          </span>
          <span className="text-[10px] text-blue-400 hover:text-blue-300 font-sans">Browse</span>
        </div>

        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
            title="Clear asset reference"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Asset Browser Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col w-full max-w-3xl h-[70vh] overflow-hidden font-mono text-xs">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-slate-100">
                  Select {assetType ? `${assetType} Asset` : 'Asset'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search bar */}
            <div className="p-3 border-b border-slate-800 bg-slate-900/50">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search assets by name, tag, category..."
                  className="w-full bg-black/50 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-slate-200 text-xs focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Asset Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center h-full text-slate-500">
                  Loading assets...
                </div>
              ) : assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
                  <ImageIcon className="w-8 h-8 text-slate-600" />
                  <span>No matching assets found</span>
                  <span className="text-[10px] text-slate-600">Try adjusting your search or upload new assets via the Asset Studio.</span>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {assets.map((asset) => {
                    const isSelected = (value === asset.id || value === asset.name);
                    return (
                      <div
                        key={asset.id}
                        onClick={() => handleSelect(asset)}
                        className={`rounded-lg border p-2 flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-950/40 border-blue-500 shadow-md ring-1 ring-blue-500/50'
                            : 'bg-black/30 border-slate-800 hover:border-slate-700 hover:bg-black/50'
                        }`}
                      >
                        <div className="w-16 h-16 rounded bg-black/60 flex items-center justify-center overflow-hidden">
                          {asset.thumbnailPath || asset.cdnUrl ? (
                            <img
                              src={asset.thumbnailPath || asset.cdnUrl!}
                              alt={asset.name}
                              className="w-full h-full object-contain pixelated"
                            />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-slate-600" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-300 font-medium truncate w-full text-center" title={asset.name}>
                          {asset.name}
                        </span>
                        <span className="text-[8px] text-slate-500 uppercase">
                          {asset.category || asset.type}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
