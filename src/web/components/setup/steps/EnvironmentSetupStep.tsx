'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Layers,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Image as ImageIcon,
  Trees,
  Castle,
  Home,
  Sparkles,
  Upload,
  FolderOpen,
  X,
  Grid3X3,
} from 'lucide-react';
import type { GameAssetItem } from '@/engine/assets/AssetManager';
import { SpriteBrowser } from '@/web/components/the-lobby/editor/SpriteBrowser';
import { AssetUploadView } from '@/web/components/the-lobby/editor/AssetUploadView';

export interface SetupEnvironmentData {
  enabledCategories: string[];
  defaultGroundGid: number;
  defaultTilesetAsset?: GameAssetItem;
}

interface EnvironmentSetupStepProps {
  environment: SetupEnvironmentData;
  onChange: (updates: Partial<SetupEnvironmentData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const TILE_CATEGORIES = [
  {
    id: 'terrain',
    name: 'Terrain & Ground',
    icon: Layers,
    description: 'Grass, dirt paths, sand, water bodies, elevation cliffs, and stone roads.',
    tileCount: 75,
    badge: 'Core Essential',
  },
  {
    id: 'nature',
    name: 'Nature & Foliage',
    icon: Trees,
    description: 'Trees, bushes, flowers, tall grass patches, and outdoor flora.',
    tileCount: 90,
    badge: 'Environment',
  },
  {
    id: 'structures',
    name: 'Structures & Buildings',
    icon: Castle,
    description: 'Roofs, walls, windows, doors, fences, and architectural components.',
    tileCount: 120,
    badge: 'Architecture',
  },
  {
    id: 'furniture',
    name: 'Interior & Objects',
    icon: Home,
    description: 'Chests, tables, chairs, signs, lanterns, and interactive props.',
    tileCount: 65,
    badge: 'Props',
  },
];

export function EnvironmentSetupStep({
  environment,
  onChange,
  onNext,
  onBack,
}: EnvironmentSetupStepProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<'catalog' | 'upload'>('catalog');
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sheetImgRef = useRef<HTMLImageElement | null>(null);
  const [sheetLoaded, setSheetLoaded] = useState(false);

  const toggleCategory = (catId: string) => {
    const current = environment.enabledCategories;
    const next = current.includes(catId)
      ? current.filter((c) => c !== catId)
      : [...current, catId];
    onChange({ enabledCategories: next });
  };

  const tileset = environment.defaultTilesetAsset;
  const tileWidth = Number(tileset?.metadata?.tilewidth || 32);
  const tileHeight = Number(tileset?.metadata?.tileheight || 32);
  const selectedGid = environment.defaultGroundGid || 1;

  // Load image for preview canvas when tileset asset changes
  useEffect(() => {
    if (!tileset?.source) {
      setSheetLoaded(false);
      return;
    }
    const img = new Image();
    img.src = tileset.source;
    img.onload = () => {
      sheetImgRef.current = img;
      setSheetLoaded(true);
    };
  }, [tileset?.source]);

  // Render 32x32 swatch of selected tile GID
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !sheetLoaded || !sheetImgRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const img = sheetImgRef.current;
    const cols = Math.max(1, Math.floor(img.width / tileWidth));
    const localIdx = Math.max(0, selectedGid - 1);
    const sx = (localIdx % cols) * tileWidth;
    const sy = Math.floor(localIdx / cols) * tileHeight;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, sx, sy, tileWidth, tileHeight, 0, 0, canvas.width, canvas.height);
  }, [sheetLoaded, selectedGid, tileWidth, tileHeight]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl space-y-8">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
            <Box className="w-5 h-5 text-amber-400" />
            4. Environment & Default Fill Tile
          </h2>
          <p className="text-sm text-slate-400">
            Configure the environment libraries available for your game and select your primary ground tilesheet and default fill tile.
          </p>
        </div>

        {/* 1. ENVIRONMENT TILE CATEGORIES */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Environment Tileset Libraries
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TILE_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isEnabled = environment.enabledCategories.includes(cat.id);
              return (
                <div
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                    isEnabled
                      ? 'bg-amber-950/20 border-amber-400 ring-1 ring-amber-400/30'
                      : 'bg-slate-950/50 border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isEnabled ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{cat.name}</span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-slate-800 text-slate-300">
                          {cat.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{cat.description}</p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-1 transition ${
                      isEnabled ? 'border-amber-400 bg-amber-400 text-slate-950' : 'border-slate-700'
                    }`}
                  >
                    {isEnabled && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. SELECT TILESHEET & DEFAULT FILL TILE */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Ground Tilesheet & Default Fill Tile
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Select a tilesheet from your catalog or upload a new one, then click a tile cell to set your world's default ground tile.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-md"
            >
              <ImageIcon className="w-4 h-4" />
              {tileset ? 'Change Tilesheet' : 'Select / Upload Tilesheet'}
            </button>
          </div>

          {tileset ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start bg-slate-950/70 border border-slate-800 rounded-2xl p-5">
              {/* Left Column: Swatch and Details */}
              <div className="lg:col-span-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-900 border border-amber-400/40 flex items-center justify-center overflow-hidden p-1 shadow-lg flex-shrink-0">
                    <canvas
                      ref={previewCanvasRef}
                      width={48}
                      height={48}
                      className="w-full h-full object-contain pixelated rounded"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-mono font-bold text-amber-400">
                      Default Tile: GID #{selectedGid}
                    </div>
                    <div className="text-sm font-bold text-white truncate">
                      {tileset.metadata?.name || tileset.id.split('/').pop()}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Grid size: {tileWidth}×{tileHeight}px
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                    <Sparkles className="w-3.5 h-3.5" /> Interactive Palette
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Click any tile cell on the sheet to the right to choose the default terrain fill tile for new maps.
                  </p>
                </div>
              </div>

              {/* Right Column: Clickable Sheet Grid */}
              <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col max-h-[380px]">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Tilesheet Grid (Click to Pick Tile)</span>
                  <span className="font-mono text-[10px] text-amber-300">Selected GID: {selectedGid}</span>
                </div>

                <div className="flex-1 overflow-auto border border-slate-800 rounded relative cursor-crosshair bg-slate-950 p-2">
                  <img
                    src={tileset.source}
                    alt="Tileset Palette"
                    className="max-w-none select-none pixelated"
                    style={{ imageRendering: 'pixelated' }}
                    onMouseDown={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const tw = tileWidth;
                      const th = tileHeight;
                      const cols = Math.max(1, Math.floor(e.currentTarget.naturalWidth / tw));
                      const x = Math.floor((e.clientX - rect.left) / tw);
                      const y = Math.floor((e.clientY - rect.top) / th);
                      const newGid = y * cols + x + 1;
                      onChange({ defaultGroundGid: newGid });
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setIsPickerOpen(true)}
              className="p-8 rounded-2xl border-2 border-dashed border-slate-800 hover:border-amber-400/50 bg-slate-950/40 hover:bg-slate-950/80 transition cursor-pointer flex flex-col items-center justify-center text-center gap-3"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center">
                <Grid3X3 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="font-bold text-white text-sm">No Ground Tilesheet Selected</div>
                <p className="text-xs text-slate-400 max-w-sm">
                  Click here to browse your tileset library or upload a tilesheet to define your world's default ground tile.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* NAVIGATION */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-slate-400 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-slate-950 bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-xl shadow-amber-500/20 transition cursor-pointer"
        >
          Design Starting Map
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* TILESET SELECTION / UPLOAD MODAL */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 sm:p-8 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col w-full max-w-5xl h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
              <div>
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-amber-400" />
                  Select Ground Tilesheet
                </h2>
              </div>
              <button
                onClick={() => setIsPickerOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex px-4 pt-2 border-b border-slate-800 bg-slate-900">
              <button
                onClick={() => setPickerTab('catalog')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                  pickerTab === 'catalog'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                Existing Tilesets
              </button>
              <button
                onClick={() => setPickerTab('upload')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                  pickerTab === 'upload'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload New Tilesheet
              </button>
            </div>

            <div className="flex-1 overflow-hidden relative bg-slate-950">
              {pickerTab === 'catalog' && (
                <div className="absolute inset-0 overflow-y-auto">
                  <SpriteBrowser
                    filterType="TILESET"
                    onSelect={(assets: GameAssetItem[]) => {
                      if (assets.length > 0) {
                        onChange({
                          defaultTilesetAsset: assets[0],
                          defaultGroundGid: 1,
                        });
                        setIsPickerOpen(false);
                      }
                    }}
                  />
                </div>
              )}

              {pickerTab === 'upload' && (
                <div className="absolute inset-0 overflow-y-auto p-4">
                  <AssetUploadView
                    initialAssetType="TILESET"
                    onUploadComplete={(asset) => {
                      onChange({
                        defaultTilesetAsset: asset as any,
                        defaultGroundGid: 1,
                      });
                      setIsPickerOpen(false);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
