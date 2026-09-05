'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Scissors,
  Grid,
  Square,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Wand2,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useGameStore } from '../store';
import { soundSynth } from '@/engine/sound-synth';
import { AssetManager } from '@/engine/assets/AssetManager';
import {
  ASSET_IMPORT_PROFILE_META,
  AssetImportProfileId,
  CHARACTER_COMPONENT_CATEGORIES,
  CHARACTER_VIEW_DIRECTIONS,
  getDefaultSlotRole,
  inferCategoryForRole,
  inferTypeForProfile,
  listAssetImportProfiles,
  listCharacterComponentCategories,
  listCharacterViewDirections,
  listSlotRolesForProfile,
} from '@/shared/game/assetImportProfiles';
import {
  detectSpriteFormat,
  getStandardSlices,
  DetectedSpriteFormat,
} from '@/shared/game/modularSpritePackage';

export interface SlicedRegion {
  id: string;
  name: string;
  type: string;
  category: string;
  importProfile: AssetImportProfileId | '';
  slotRole: string;
  animationProfile?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  facing: string;
  animationState: string;
  animationFrames: number;
}

export interface SpritesheetSlicerProps {
  sourceAsset?: {
    id: string;
    filename: string;
    storagePath: string;
    width?: number;
    height?: number;
  };
  defaultImportProfile?: AssetImportProfileId;
  defaultGridSize?: number;
  onSliceComplete?: (assets: any[]) => void;
}

export function SpritesheetSlicer({
  sourceAsset,
  defaultImportProfile,
  defaultGridSize,
  onSliceComplete,
}: SpritesheetSlicerProps) {
  const showToast = useGameStore((s) => s.showToast);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [imageUrl, setImageUrl] = useState<string>(sourceAsset?.storagePath || '');
  const [sourceId, setSourceId] = useState<string>(sourceAsset?.id || '');
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<DetectedSpriteFormat | null>(null);

  // Slicing Mode
  const [sliceMode, setSliceMode] = useState<'grid' | 'box'>('grid');
  const [gridSize, setGridSize] = useState<number>(defaultGridSize || 64);
  const [scale, setScale] = useState<number>(2);
  const [importProfile, setImportProfile] = useState<AssetImportProfileId>(defaultImportProfile || 'character');

  useEffect(() => {
    if (defaultGridSize) setGridSize(defaultGridSize);
  }, [defaultGridSize]);

  useEffect(() => {
    if (defaultImportProfile) setImportProfile(defaultImportProfile);
  }, [defaultImportProfile]);
  const [assetMode, setAssetMode] = useState<'full-character' | 'modular-component'>('full-character');
  const [selectedView, setSelectedView] = useState<string>('front');
  const [selectedComponentCategory, setSelectedComponentCategory] = useState<string>('hat');

  // Region Selection State
  const [regions, setRegions] = useState<SlicedRegion[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  // Update image url & source id when props change
  useEffect(() => {
    if (sourceAsset) {
      setImageUrl(sourceAsset.storagePath);
      setSourceId(sourceAsset.id);
    }
  }, [sourceAsset]);

  const getProfileDefaults = (profile: AssetImportProfileId) => {
    const role = getDefaultSlotRole(profile);
    return {
      importProfile: profile,
      slotRole: role,
      type: inferTypeForProfile(profile),
      category: inferCategoryForRole(role) || 'sprite',
    };
  };

  const applySuggestedRegionMeta = (region: SlicedRegion): SlicedRegion => {
    const viewFacing = CHARACTER_VIEW_DIRECTIONS[selectedView as keyof typeof CHARACTER_VIEW_DIRECTIONS]?.facing || 'S';
    const componentCategory = assetMode === 'modular-component' ? selectedComponentCategory : 'clothing';
    const inferredRole = assetMode === 'modular-component'
      ? componentCategory
      : getDefaultSlotRole(importProfile);
    const inferredCategory = inferCategoryForRole(inferredRole) || componentCategory || 'sprite';

    return {
      ...region,
      importProfile,
      slotRole: inferredRole,
      category: inferredCategory,
      facing: viewFacing,
      name: assetMode === 'modular-component'
        ? `${componentCategory}_${selectedView}`
        : `${selectedView}_view`,
    };
  };

  // Load image
  useEffect(() => {
    if (!imageUrl) {
      setImageElement(null);
      setDetectedFormat(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageElement(img);
      const detected = detectSpriteFormat(img.naturalWidth, img.naturalHeight);
      setDetectedFormat(detected);
      if (detected.isRecognized && detected.frameWidth) {
        setGridSize(detected.frameWidth);
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Render Canvas with Image, Grid, and Slicing Boxes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageElement) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = imageElement.naturalWidth;
    const h = imageElement.naturalHeight;

    canvas.width = w * scale;
    canvas.height = h * scale;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw base spritesheet
    ctx.drawImage(imageElement, 0, 0, w * scale, h * scale);

    // Draw Grid Overlay
    if (sliceMode === 'grid') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x * scale, 0);
        ctx.lineTo(x * scale, h * scale);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y * scale);
        ctx.lineTo(w * scale, y * scale);
        ctx.stroke();
      }
    }

    // Draw Defined Regions
    regions.forEach((r) => {
      const isSelected = r.id === selectedRegionId;
      ctx.strokeStyle = isSelected ? '#f59e0b' : '#38bdf8';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.fillStyle = isSelected ? 'rgba(245, 158, 11, 0.25)' : 'rgba(56, 189, 248, 0.15)';

      ctx.fillRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
      ctx.strokeRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);

      // Label
      ctx.fillStyle = isSelected ? '#fbbf24' : '#bae6fd';
      ctx.font = '10px monospace';
      ctx.fillText(r.name || r.id, r.x * scale + 4, r.y * scale + 12);
    });

    // Draw Active Drag Box
    if (currentBox) {
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 1.5;
      ctx.fillStyle = 'rgba(236, 72, 153, 0.3)';
      ctx.fillRect(currentBox.x * scale, currentBox.y * scale, currentBox.w * scale, currentBox.h * scale);
      ctx.strokeRect(currentBox.x * scale, currentBox.y * scale, currentBox.w * scale, currentBox.h * scale);
    }
  }, [imageElement, scale, sliceMode, gridSize, regions, selectedRegionId, currentBox]);

  // Canvas Mouse Events for Selecting/Drawing Regions
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageElement) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = Math.floor((e.clientX - rect.left) / scale);
    const clickY = Math.floor((e.clientY - rect.top) / scale);

    if (sliceMode === 'grid') {
      const cellX = Math.floor(clickX / gridSize) * gridSize;
      const cellY = Math.floor(clickY / gridSize) * gridSize;

      // Check if clicking existing region
      const existing = regions.find((r) => r.x === cellX && r.y === cellY && r.w === gridSize && r.h === gridSize);
      if (existing) {
        setSelectedRegionId(existing.id);
        soundSynth?.playUiClick?.();
      } else {
        // Add new cell
        const newRegion: SlicedRegion = applySuggestedRegionMeta({
          id: `slice_${Date.now() % 10000}`,
          name: `cell_${cellX}_${cellY}`,
          ...getProfileDefaults(importProfile),
          x: cellX,
          y: cellY,
          w: gridSize,
          h: gridSize,
          facing: 'S',
          animationState: 'idle',
          animationFrames: 1,
        });
        soundSynth?.playSelectSound?.();
        setRegions((prev) => [...prev, newRegion]);
        setSelectedRegionId(newRegion.id);
      }
    } else {
      // Box Drag Mode
      setIsDragging(true);
      setDragStart({ x: clickX, y: clickY });
      setCurrentBox({ x: clickX, y: clickY, w: 0, h: 0 });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const curX = Math.floor((e.clientX - rect.left) / scale);
    const curY = Math.floor((e.clientY - rect.top) / scale);

    const x = Math.min(dragStart.x, curX);
    const y = Math.min(dragStart.y, curY);
    const w = Math.abs(curX - dragStart.x);
    const h = Math.abs(curY - dragStart.y);

    setCurrentBox({ x, y, w, h });
  };

  const handleCanvasMouseUp = () => {
    if (!isDragging || !currentBox) return;
    setIsDragging(false);

    if (currentBox.w > 4 && currentBox.h > 4) {
      const newRegion: SlicedRegion = applySuggestedRegionMeta({
        id: `box_${Date.now() % 10000}`,
        name: `region_${currentBox.x}_${currentBox.y}`,
        ...getProfileDefaults(importProfile),
        x: currentBox.x,
        y: currentBox.y,
        w: currentBox.w,
        h: currentBox.h,
        facing: 'S',
        animationState: 'idle',
        animationFrames: 1,
      });
      soundSynth?.playSelectSound?.();
      setRegions((prev) => [...prev, newRegion]);
      setSelectedRegionId(newRegion.id);
    }
    setCurrentBox(null);
    setDragStart(null);
  };

  const removeRegion = (id: string) => {
    soundSynth?.playUiClick?.();
    setRegions((prev) => prev.filter((r) => r.id !== id));
    if (selectedRegionId === id) setSelectedRegionId(null);
  };

  const autoSliceAllCells = () => {
    if (!imageElement) return;
    soundSynth?.playSelectSound?.();
    const w = imageElement.naturalWidth;
    const h = imageElement.naturalHeight;
    const newRegions: SlicedRegion[] = [];

    let count = 0;
    for (let y = 0; y < h; y += gridSize) {
      for (let x = 0; x < w; x += gridSize) {
        newRegions.push(
          applySuggestedRegionMeta({
            id: `cell_${count++}`,
            name: `frame_${count}`,
            ...getProfileDefaults(importProfile),
            x,
            y,
            w: Math.min(gridSize, w - x),
            h: Math.min(gridSize, h - y),
            facing: 'S',
            animationState: 'walk',
            animationFrames: 1,
          })
        );
      }
    }
    setRegions(newRegions);
    showToast(`Generated ${newRegions.length} grid cells!`);
  };

  /** Applies smart modular presets (Full Character, Walk Cycle, Saints 2.5D, Idles) */
  const applyPresetSlices = (preset: 'multi_frame_directional' | 'directional_walk' | 'directional_3x4' | 'directional_idles') => {
    if (!imageElement) {
      showToast('Load an image first before applying slicing presets.');
      return;
    }

    soundSynth?.playSelectSound?.();
    const slices = getStandardSlices(preset, {
      sheetWidth: imageElement.naturalWidth,
      sheetHeight: imageElement.naturalHeight,
      prefix: sourceAsset?.filename ? sourceAsset.filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') : '',
    });

    const mapped: SlicedRegion[] = slices.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      category: s.category,
      importProfile: 'character',
      slotRole: s.slotRole,
      animationProfile: preset === 'directional_3x4' ? 'directional_3x4' : preset === 'directional_walk' ? 'directional_walk' : 'multi_frame_directional',
      x: s.x,
      y: s.y,
      w: s.w,
      h: s.h,
      facing: s.facing,
      animationState: s.animationState,
      animationFrames: s.animationFrames,
    }));

    setRegions(mapped);
    const labels = {
      'multi_frame_directional': 'Full Modular Animation Suite',
      'directional_walk': '4-Direction Walk Cycle',
      'directional_3x4': 'Saints 2.5D MMO 3x4 Grid',
      'directional_idles': '4-Direction Standing Idles',
    };
    showToast(`Applied ${labels[preset]}: ${mapped.length} slice regions generated!`);
  };

  const handleBatchSliceSubmit = async () => {
    if (!sourceId) {
      setErrorMessage('Please provide or select a valid SourceAsset ID.');
      return;
    }
    if (regions.length === 0) {
      setErrorMessage('Please slice at least one region on the spritesheet.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        sourceAssetId: sourceId,
        importProfile,
        mode: 'spritesheet',
        strictRequiredRoles: false,
        regions: regions.map((r) => ({
          name: r.name,
          type: r.type,
          category: r.category,
          importProfile: r.importProfile || importProfile,
          slotRole: r.slotRole,
          animationProfile: r.animationProfile,
          sourceMode: 'spritesheet',
          sourceRegion: { x: r.x, y: r.y, w: r.w, h: r.h },
          facing: r.facing,
          animationState: r.animationState,
          animationFrames: r.animationFrames,
        })),
      };

      const res = await fetch('/api/assets/slice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to slice and register assets');
      }

      soundSynth?.playSelectSound?.();
      setSuccessCount(data.count);
      showToast(`Successfully registered ${data.count} usable assets!`);
      AssetManager.getInstance().broadcastRefresh();
      if (onSliceComplete) onSliceComplete(data.assets);
    } catch (err: any) {
      console.error('Slicing error:', err);
      setErrorMessage(err.message || 'Failed to batch slice assets.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 text-xs font-mono text-slate-300">
      {/* HEADER */}
      <div className="bg-[#0b1320]/80 border border-[#cbb26a]/30 rounded p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-[#e2d5b3] font-bold text-sm">
          <Scissors className="w-4 h-4 text-amber-400" /> Visual Spritesheet Slicer & Sprite Animation Extractor
        </div>
        <p className="text-[11px] text-slate-400">
          Slice multi-frame spritesheets into categorized Usable Assets with directional metadata, modular animation
          presets, and MMO walk cycles.
        </p>
      </div>

      {/* MODULAR AUTO-SLICING TOOLBAR */}
      <div className="bg-[#07111c] border border-cyan-500/30 rounded p-2.5 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-cyan-400" />
          <span className="text-cyan-300 font-bold text-xs">Auto-Slice Presets:</span>
          {detectedFormat?.isRecognized && (
            <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/40">
              {detectedFormat.label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => applyPresetSlices('multi_frame_directional')}
            className="px-2.5 py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded font-bold text-[10px] transition-all flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3 h-3" /> Auto-Slice Full Sheet
          </button>
          <button
            type="button"
            onClick={() => applyPresetSlices('directional_walk')}
            className="px-2.5 py-1 bg-cyan-900/90 hover:bg-cyan-800 text-cyan-200 rounded font-bold text-[10px] transition-all cursor-pointer"
          >
            Extract Walk Cycle (4-Dir)
          </button>
          <button
            type="button"
            onClick={() => applyPresetSlices('directional_3x4')}
            className="px-2.5 py-1 bg-amber-700 hover:bg-amber-600 text-white rounded font-bold text-[10px] transition-all cursor-pointer"
          >
            Extract Saints 2.5D (3x4)
          </button>
          <button
            type="button"
            onClick={() => applyPresetSlices('directional_idles')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-[10px] transition-all cursor-pointer"
          >
            Extract Idles (4-Dir)
          </button>
        </div>
      </div>

      {successCount !== null ? (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded p-4 text-center space-y-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <div className="text-emerald-200 font-bold text-sm">
            {successCount} Usable Assets Created & Linked!
          </div>
          <p className="text-[11px] text-slate-300">
            Assets are now registered with proper direction, role, and animation frames in the Asset Catalog.
          </p>
          <button
            type="button"
            onClick={() => {
              setSuccessCount(null);
              setRegions([]);
            }}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold transition-all shadow cursor-pointer"
          >
            Slice Another Sheet
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* SOURCE ASSET CONFIG */}
          <div className="bg-[#050b14] border border-slate-800 rounded p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Source Image URL / Path</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="/uploads/... or /game-assets/..."
                  className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Source Asset ID</label>
                <input
                  type="text"
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  placeholder="CUID from SourceAsset table"
                  className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Import Profile</label>
                <select
                  value={importProfile}
                  onChange={(e) => {
                    const seraphtProfile = e.target.value as AssetImportProfileId;
                    setImportProfile(seraphtProfile);
                  }}
                  className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                >
                  {listAssetImportProfiles().map((profile) => (
                    <option key={profile} value={profile}>
                      {ASSET_IMPORT_PROFILE_META[profile].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Asset Layout</label>
                <select
                  value={assetMode}
                  onChange={(e) => setAssetMode(e.target.value as 'full-character' | 'modular-component')}
                  className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                >
                  <option value="full-character">Full Character / Full Sprite</option>
                  <option value="modular-component">Modular Component</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">View Direction</label>
                <select
                  value={selectedView}
                  onChange={(e) => setSelectedView(e.target.value)}
                  className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                >
                  {listCharacterViewDirections().map((view) => (
                    <option key={view} value={view}>
                      {CHARACTER_VIEW_DIRECTIONS[view].label}
                    </option>
                  ))}
                </select>
              </div>
              {assetMode === 'modular-component' && (
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Component Type</label>
                  <select
                    value={selectedComponentCategory}
                    onChange={(e) => setSelectedComponentCategory(e.target.value)}
                    className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                  >
                    {listCharacterComponentCategories().map((category) => (
                      <option key={category} value={category}>
                        {CHARACTER_COMPONENT_CATEGORIES[category].label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* CONTROLS */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSliceMode('grid')}
                  className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] font-bold cursor-pointer ${
                    sliceMode === 'grid' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Grid className="w-3 h-3" /> Grid Mode
                </button>
                <button
                  type="button"
                  onClick={() => setSliceMode('box')}
                  className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] font-bold cursor-pointer ${
                    sliceMode === 'box' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Square className="w-3 h-3" /> Free Box
                </button>
              </div>

              {sliceMode === 'grid' && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">Cell Size:</span>
                  {[16, 24, 32, 48, 64].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setGridSize(size)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        gridSize === size ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {size}px
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={autoSliceAllCells}
                    className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-amber-300 rounded text-[10px] font-bold cursor-pointer"
                  >
                    Slice All
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400">Zoom:</span>
                {[1, 2, 3, 4].map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setScale(z)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                      scale === z ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {z}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* INTERACTIVE CANVAS VIEW */}
          <div className="border border-slate-800 rounded bg-black/60 p-2 overflow-auto max-h-[380px] flex items-center justify-center">
            {imageUrl ? (
              <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                className="cursor-crosshair border border-slate-700/50 shadow-lg"
              />
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                Enter an image URL or upload a SourceAsset to start slicing.
              </div>
            )}
          </div>

          {/* SLICED REGIONS LIST & PROPERTY CONFIG */}
          {regions.length > 0 && (
            <div className="bg-[#050b14] border border-slate-800 rounded p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                <span>Defined Slices ({regions.length})</span>
                <button
                  type="button"
                  onClick={() => setRegions([])}
                  className="text-rose-400 hover:text-rose-300 text-[10px] cursor-pointer"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                {regions.map((r) => {
                  const isSelected = r.id === selectedRegionId;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRegionId(r.id)}
                      className={`flex items-center gap-2 p-1.5 rounded border text-[11px] cursor-pointer transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-950/20 text-white'
                          : 'border-slate-800 bg-[#0b1320]/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-[10px] text-amber-400 font-bold shrink-0">
                        [{r.x},{r.y} {r.w}x{r.h}]
                      </span>
                      <input
                        type="text"
                        value={r.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRegions((prev) => prev.map((item) => (item.id === r.id ? { ...item, name: val } : item)));
                        }}
                        className="bg-transparent border-b border-slate-700 px-1 text-white text-[11px] flex-1"
                        placeholder="Slice Name"
                      />
                      <select
                        value={r.slotRole}
                        onChange={(e) => {
                          const seraphtRole = e.target.value;
                          setRegions((prev) =>
                            prev.map((item) => {
                              if (item.id !== r.id) {
                                return item;
                              }

                              const inferredCategory = inferCategoryForRole(seraphtRole);
                              return {
                                ...item,
                                slotRole: seraphtRole,
                                category: inferredCategory || item.category,
                              };
                            })
                          );
                        }}
                        className="bg-[#050b14] border border-slate-700 rounded px-1 text-[10px] text-slate-200"
                      >
                        {listSlotRolesForProfile((r.importProfile || importProfile) as AssetImportProfileId).map(
                          (role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          )
                        )}
                      </select>
                      <select
                        value={r.facing}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRegions((prev) => prev.map((item) => (item.id === r.id ? { ...item, facing: val } : item)));
                        }}
                        className="bg-[#050b14] border border-slate-700 rounded px-1 text-[10px] text-slate-200"
                      >
                        <option value="S">South (Down)</option>
                        <option value="N">North (Up)</option>
                        <option value="E">East (Right)</option>
                        <option value="W">West (Left)</option>
                      </select>
                      <select
                        value={r.animationState}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRegions((prev) =>
                            prev.map((item) => (item.id === r.id ? { ...item, animationState: val } : item))
                          );
                        }}
                        className="bg-[#050b14] border border-slate-700 rounded px-1 text-[10px] text-slate-200"
                      >
                        <option value="idle">Idle</option>
                        <option value="walk">Walk</option>
                        <option value="slash">Slash</option>
                        <option value="thrust">Thrust</option>
                        <option value="spellcast">Spellcast</option>
                        <option value="shoot">Shoot</option>
                        <option value="hurt">Hurt</option>
                      </select>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRegion(r.id);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="bg-rose-950/40 border border-rose-500/40 rounded p-2 text-rose-300 text-[11px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleBatchSliceSubmit}
            disabled={isSubmitting || regions.length === 0}
            className={`w-full py-2 rounded font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isSubmitting || regions.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-[0_0_15px_rgba(217,119,6,0.3)]'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Batch Slicing Assets...
              </>
            ) : (
              <>
                <Scissors className="w-4 h-4" /> Slice & Register {regions.length} Usable Assets
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
