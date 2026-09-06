'use client';

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useGameStore } from '../../store';
import { useEditorStore, type CustomTerrainSwatch, type CustomPropItem } from '../editor-store';
import {
  Scissors,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Grid,
  Check,
  Tag,
  Box,
  Layers,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Save,
  TreePine,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';
import { ensureMapHasStudioTilesets, DEFAULT_STUDIO_TILESETS } from '@/shared/game/studioTilesetBootstrap';

export const SheetSlicerPanel: React.FC = () => {
  const activeMapData = useGameStore((s) => s.activeMapData);
  const showToast = useGameStore((s) => s.showToast);

  const addCustomTerrainSwatch = useEditorStore((s) => s.addCustomTerrainSwatch);
  const addCustomPropItem = useEditorStore((s) => s.addCustomPropItem);
  const setActiveStampAsset = useEditorStore((s) => s.setActiveStampAsset);
  const setActiveLayerType = useEditorStore((s) => s.setActiveLayerType);

  // Loaded tilesets list
  const tilesets = useMemo(() => {
    if (!activeMapData) return DEFAULT_STUDIO_TILESETS;
    const map = ensureMapHasStudioTilesets(activeMapData);
    return map.tilesets?.length ? map.tilesets : DEFAULT_STUDIO_TILESETS;
  }, [activeMapData]);

  const [selectedSheetUrl, setSelectedSheetUrl] = useState<string>(
    tilesets[0]?.imageSource || '/game-assets/tilesets/terrain-overworld.png'
  );

  const [zoom, setZoom] = useState<number>(2); // 1x, 2x, 3x, 4x
  const [gridSnapSize, setGridSnapSize] = useState<number>(16); // 0 (free), 16, 32, 48, 64
  const [showGridLines, setShowGridLines] = useState<boolean>(true);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(true);

  // Selection box state in image pixel coordinates
  const [selection, setSelection] = useState<{ x: number; y: number; w: number; h: number } | null>({
    x: 0,
    y: 0,
    w: 32,
    h: 32,
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Slice metadata inputs
  const [sliceName, setSliceName] = useState<string>('Custom Sliced Asset');
  const [propCategory, setPropCategory] = useState<'Tree' | 'Rock' | 'Building' | 'Foliage' | 'Decor' | 'Structure'>('Foliage');
  const [propCollision, setPropCollision] = useState<'SOLID' | 'NONE' | 'WATER'>('SOLID');

  // Image natural dimensions
  const [imgNaturalSize, setImgNaturalSize] = useState<{ w: number; h: number }>({ w: 512, h: 512 });
  const imageRef = useRef<HTMLImageElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const fullImageUrl = useMemo(() => {
    if (!selectedSheetUrl) return '';
    return selectedSheetUrl.startsWith('/') || selectedSheetUrl.startsWith('http')
      ? selectedSheetUrl
      : `/game-assets/tilesets/${selectedSheetUrl}`;
  }, [selectedSheetUrl]);

  // Handle Image Load to get true dimensions
  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgNaturalSize({ w: img.naturalWidth || 512, h: img.naturalHeight || 512 });
  };

  // Calculate normalized UV mapping coordinates
  const uvCoords = useMemo(() => {
    if (!selection || imgNaturalSize.w <= 0 || imgNaturalSize.h <= 0) {
      return { uOffset: 0, vOffset: 0, uScale: 1, vScale: 1 };
    }
    const uScale = selection.w / imgNaturalSize.w;
    const vScale = selection.h / imgNaturalSize.h;
    const uOffset = selection.x / imgNaturalSize.w;
    const vOffset = 1 - (selection.y + selection.h) / imgNaturalSize.h;

    return { uOffset, vOffset, uScale, vScale };
  }, [selection, imgNaturalSize]);

  // Render isolated slice to preview canvas
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !selection || !imageRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = Math.max(1, selection.w);
    canvas.height = Math.max(1, selection.h);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(
      imageRef.current,
      selection.x,
      selection.y,
      selection.w,
      selection.h,
      0,
      0,
      canvas.width,
      canvas.height
    );
  }, [selection, selectedSheetUrl, imgNaturalSize]);

  // Mouse selection handlers on the sheet viewport
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = (e.clientX - rect.left) / zoom;
    const rawY = (e.clientY - rect.top) / zoom;

    let startX = Math.max(0, Math.min(imgNaturalSize.w, rawX));
    let startY = Math.max(0, Math.min(imgNaturalSize.h, rawY));

    if (gridSnapSize > 0) {
      startX = Math.floor(startX / gridSnapSize) * gridSnapSize;
      startY = Math.floor(startY / gridSnapSize) * gridSnapSize;
    }

    setIsDragging(true);
    setDragStart({ x: startX, y: startY });
    setSelection({
      x: startX,
      y: startY,
      w: gridSnapSize > 0 ? gridSnapSize : 16,
      h: gridSnapSize > 0 ? gridSnapSize : 16,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = (e.clientX - rect.left) / zoom;
    const rawY = (e.clientY - rect.top) / zoom;

    let curX = Math.max(0, Math.min(imgNaturalSize.w, rawX));
    let curY = Math.max(0, Math.min(imgNaturalSize.h, rawY));

    if (gridSnapSize > 0) {
      curX = Math.ceil(curX / gridSnapSize) * gridSnapSize;
      curY = Math.ceil(curY / gridSnapSize) * gridSnapSize;
    }

    const minX = Math.min(dragStart.x, curX);
    const minY = Math.min(dragStart.y, curY);
    const w = Math.max(gridSnapSize > 0 ? gridSnapSize : 1, Math.abs(curX - dragStart.x));
    const h = Math.max(gridSnapSize > 0 ? gridSnapSize : 1, Math.abs(curY - dragStart.y));

    setSelection({
      x: minX,
      y: minY,
      w: Math.min(w, imgNaturalSize.w - minX),
      h: Math.min(h, imgNaturalSize.h - minY),
    });
  };

  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      soundSynth?.playUiClick?.();
    }
  };

  // Save slice as custom terrain texture swatch
  const handleSaveAsTerrainSwatch = () => {
    if (!selection) return;
    soundSynth?.playActionSound?.();

    const swatchId = `swatch_slice_${Date.now()}`;
    const name = sliceName.trim() || `Terrain Patch (${selection.w}x${selection.h})`;

    const swatch: CustomTerrainSwatch = {
      id: swatchId,
      name,
      sourceSheet: fullImageUrl,
      sourceX: selection.x,
      sourceY: selection.y,
      sourceWidth: selection.w,
      sourceHeight: selection.h,
      uOffset: uvCoords.uOffset,
      vOffset: uvCoords.vOffset,
      uScale: uvCoords.uScale,
      vScale: uvCoords.vScale,
      category: 'SLICED',
    };

    addCustomTerrainSwatch(swatch);
    setActiveLayerType('paint-splat');
    setActiveStampAsset({
      assetId: swatchId,
      url: fullImageUrl,
      width: selection.w / 16,
      height: selection.h / 16,
      uOffset: uvCoords.uOffset,
      vOffset: uvCoords.vOffset,
      uScale: uvCoords.uScale,
      vScale: uvCoords.vScale,
    });

    showToast(`Saved "${name}" to Terrain Swatches! Switched to Splat tool.`);
  };

  // Save slice to Prop & Foliage Library
  const handleSaveToPropLibrary = () => {
    if (!selection) return;
    soundSynth?.playActionSound?.();

    const propId = `prop_slice_${Date.now()}`;
    const name = sliceName.trim() || `${propCategory} (${selection.w}x${selection.h})`;

    const propItem: CustomPropItem = {
      id: propId,
      name,
      category: propCategory,
      sourceSheet: fullImageUrl,
      sourceX: selection.x,
      sourceY: selection.y,
      sourceWidth: selection.w,
      sourceHeight: selection.h,
      uOffset: uvCoords.uOffset,
      vOffset: uvCoords.vOffset,
      uScale: uvCoords.uScale,
      vScale: uvCoords.vScale,
      defaultScale: 1.0,
      collision: propCollision,
      elevationOffset: 0,
    };

    addCustomPropItem(propItem);
    setActiveLayerType('free-form');
    setActiveStampAsset({
      assetId: propId,
      url: fullImageUrl,
      width: selection.w / 16,
      height: selection.h / 16,
      uOffset: uvCoords.uOffset,
      vOffset: uvCoords.vOffset,
      uScale: uvCoords.uScale,
      vScale: uvCoords.vScale,
    });

    showToast(`Saved "${name}" to Prop Library! Switched to Prop Stamp tool.`);
  };

  return (
    <div className="flex flex-col h-[500px] max-h-[60vh] bg-[#02050a] text-slate-200 shadow-2xl overflow-hidden font-sans border border-border/20 rounded-lg">
      
      {/* Top Header & Sheet Picker */}
      <div className="shrink-0 p-3 border-b border-border/40 bg-[#0a1628]/80 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/20 text-primary border border-primary/40">
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-foreground text-xs flex items-center gap-1.5">
              <span>Sheet Slicer & Precision Cutter</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary/20 text-primary border border-primary/40">
                UV Slicer
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              Extract textures & props with exact pixel boundaries
            </div>
          </div>
        </div>

        {/* Tileset Selector Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground shrink-0">Source Sheet:</span>
          <select
            value={selectedSheetUrl}
            onChange={(e) => {
              setSelectedSheetUrl(e.target.value);
              setSelection(null);
            }}
            className="px-2.5 py-1 rounded bg-[#060e1c] border border-border/50 text-foreground text-xs font-mono focus:border-primary focus:outline-none cursor-pointer"
          >
            {tilesets.map((ts: any, idx: number) => (
              <option key={ts.imageSource || idx} value={ts.imageSource}>
                {ts.imageSource.split('/').pop() || `Tileset #${idx + 1}`} ({ts.tilewidth}x{ts.tileheight})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Interactive Tool Guide Banner */}
      <div className="border-b border-border/30 bg-[#071120]">
        <button
          type="button"
          onClick={() => setIsGuideOpen(!isGuideOpen)}
          className="w-full px-3 py-1.5 flex items-center justify-between text-[10px] font-bold text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-1.5 text-primary">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>How To Use The Sheet Slicer</span>
          </div>
          {isGuideOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {isGuideOpen && (
          <div className="px-3 pb-2.5 pt-1 text-[10px] text-muted-foreground grid grid-cols-1 md:grid-cols-3 gap-2 bg-[#040912]/60 border-t border-border/20">
            <div className="p-2 rounded bg-[#0a1628]/50 border border-border/30">
              <span className="font-bold text-primary mr-1">1. Choose Sheet & Grid:</span>
              Select a spritesheet above. Set grid snap (e.g. 16px or Freeform) to match tile boundaries.
            </div>
            <div className="p-2 rounded bg-[#0a1628]/50 border border-border/30">
              <span className="font-bold text-primary mr-1">2. Click & Drag Slice:</span>
              Drag across any tile, multi-tile building, tree, or rock in the viewport to frame your crop box.
            </div>
            <div className="p-2 rounded bg-[#0a1628]/50 border border-border/30">
              <span className="font-bold text-primary mr-1">3. Save & Paint:</span>
              Save as a continuous terrain splat swatch or prop stamp. It automatically selects the tool to place in-world!
            </div>
          </div>
        )}
      </div>

      {/* Main Slicing Workspace: Canvas & Inspector */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left/Center: Viewport Area */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-border/30 bg-[#03070f]">
          
          {/* Viewport Control Bar */}
          <div className="px-3 py-2 border-b border-border/30 bg-[#081222]/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-[#060e1c] p-0.5 rounded border border-border/40">
                <button
                  type="button"
                  onClick={() => setZoom(Math.max(1, zoom - 1))}
                  className="p-1 hover:bg-[#0a1628] rounded text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-[10px] font-bold text-primary">{zoom}x</span>
                <button
                  type="button"
                  onClick={() => setZoom(Math.min(6, zoom + 1))}
                  className="p-1 hover:bg-[#0a1628] rounded text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Grid Snap Size */}
              <div className="flex items-center gap-1.5">
                <Grid className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Grid Snap:</span>
                {[0, 16, 32, 48, 64].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setGridSnapSize(size)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-colors ${
                      gridSnapSize === size
                        ? 'bg-primary/20 text-primary border border-primary/50'
                        : 'bg-[#060e1c] text-muted-foreground border border-border/30 hover:border-border'
                    }`}
                  >
                    {size === 0 ? 'Free' : `${size}px`}
                  </button>
                ))}
              </div>
            </div>

            {/* Selection Telemetry Badge */}
            {selection && (
              <div className="text-[10px] font-mono text-muted-foreground bg-[#060e1c] px-2.5 py-1 rounded border border-border/40 flex items-center gap-2">
                <span>Pos: <span className="text-foreground">{selection.x}, {selection.y}</span></span>
                <span>Dim: <span className="text-primary font-bold">{selection.w} × {selection.h} px</span></span>
                <span>({Math.round((selection.w / 16) * 10) / 10}×{Math.round((selection.h / 16) * 10) / 10} tiles)</span>
              </div>
            )}
          </div>

          {/* Interactive Sheet Viewport with drag-crop */}
          <div className="flex-1 overflow-auto p-4 custom-scrollbar flex items-start justify-center bg-[#02050a] relative">
            <div
              className="relative select-none cursor-crosshair border border-border/40 shadow-2xl rounded"
              style={{
                width: `${imgNaturalSize.w * zoom}px`,
                height: `${imgNaturalSize.h * zoom}px`,
                backgroundImage: 'linear-gradient(45deg, #091322 25%, transparent 25%), linear-gradient(-45deg, #091322 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #091322 75%), linear-gradient(-45deg, transparent 75%, #091322 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {/* Loaded Source Image */}
              <img
                ref={imageRef}
                src={fullImageUrl}
                alt="Tileset Source"
                crossOrigin="anonymous"
                onLoad={handleImageLoaded}
                className="w-full h-full object-contain pointer-events-none"
                style={{ imageRendering: 'pixelated' }}
              />

              {/* Pixel Grid Lines Overlay */}
              {gridSnapSize > 0 && showGridLines && (
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage: `linear-gradient(to right, #f59e0b 1px, transparent 1px), linear-gradient(to bottom, #f59e0b 1px, transparent 1px)`,
                    backgroundSize: `${gridSnapSize * zoom}px ${gridSnapSize * zoom}px`,
                  }}
                />
              )}

              {/* Selection Bounding Box */}
              {selection && (
                <div
                  className="absolute border-2 border-primary bg-primary/20 pointer-events-none shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-all duration-75"
                  style={{
                    left: `${selection.x * zoom}px`,
                    top: `${selection.y * zoom}px`,
                    width: `${selection.w * zoom}px`,
                    height: `${selection.h * zoom}px`,
                  }}
                >
                  <div className="absolute -top-5 left-0 px-1.5 py-0.2 bg-primary text-black font-bold text-[8px] rounded uppercase">
                    {selection.w}×{selection.h}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Crop Inspector & Output Dispatcher */}
        <div className="w-full lg:w-80 flex flex-col overflow-y-auto p-4 custom-scrollbar bg-[#050c18] border-t lg:border-t-0 border-border/40 space-y-4">
          
          <div>
            <h4 className="text-xs font-bold text-foreground">Slice Properties</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Review isolated crop before saving to library
            </p>
          </div>

          {/* Isolated Slice Canvas Preview */}
          <div className="p-3 rounded-lg bg-[#081324] border border-border/40 space-y-2 flex flex-col items-center">
            <span className="text-[10px] font-bold text-muted-foreground uppercase self-start">
              Isolated Preview
            </span>
            <div
              className="w-32 h-32 rounded border border-border/50 flex items-center justify-center overflow-hidden"
              style={{
                backgroundImage: 'linear-gradient(45deg, #0b182e 25%, transparent 25%), linear-gradient(-45deg, #0b182e 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #0b182e 75%), linear-gradient(-45deg, transparent 75%, #0b182e 75%)',
                backgroundSize: '12px 12px',
                backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
              }}
            >
              <canvas
                ref={previewCanvasRef}
                className="max-w-full max-h-full object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            <div className="text-[9px] text-muted-foreground text-center">
              {selection ? `${selection.w} × ${selection.h} pixels` : 'No selection'}
            </div>
          </div>

          {/* Slice Name Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">
              Asset Name
            </label>
            <input
              type="text"
              value={sliceName}
              onChange={(e) => setSliceName(e.target.value)}
              placeholder="e.g. Oak Tree, Cobble Patch"
              className="w-full px-3 py-1.5 rounded bg-[#081324] border border-border/50 text-foreground text-xs font-mono focus:border-primary focus:outline-none"
            />
          </div>

          {/* Prop Category Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">
              Prop Category
            </label>
            <select
              value={propCategory}
              onChange={(e) => setPropCategory(e.target.value as any)}
              className="w-full px-3 py-1.5 rounded bg-[#081324] border border-border/50 text-foreground text-xs font-mono focus:border-primary focus:outline-none cursor-pointer"
            >
              <option value="Tree">Tree (Foliage)</option>
              <option value="Foliage">Foliage / Bush</option>
              <option value="Rock">Rock / Boulder</option>
              <option value="Building">Building / House</option>
              <option value="Structure">Structure / Wall</option>
              <option value="Decor">Decor / Furniture</option>
            </select>
          </div>

          {/* Collision Mode */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">
              Collision Mode
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'SOLID', label: 'Solid' },
                { id: 'NONE', label: 'Passable' },
                { id: 'WATER', label: 'Water' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setPropCollision(c.id as any)}
                  className={`py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                    propCollision === c.id
                      ? 'bg-primary/20 text-primary border-primary/50'
                      : 'bg-[#081324] text-muted-foreground border-border/30 hover:border-border'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Normalized UV Telemetry */}
          <div className="p-2.5 rounded bg-[#081324] border border-border/30 text-[9px] text-muted-foreground font-mono space-y-1">
            <div className="text-[10px] font-bold text-foreground">Calculated UV Coordinates</div>
            <div className="flex justify-between">
              <span>uOffset:</span>
              <span className="text-foreground">{uvCoords.uOffset.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span>vOffset:</span>
              <span className="text-foreground">{uvCoords.vOffset.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span>uScale:</span>
              <span className="text-foreground">{uvCoords.uScale.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span>vScale:</span>
              <span className="text-foreground">{uvCoords.vScale.toFixed(4)}</span>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              disabled={!selection}
              onClick={handleSaveAsTerrainSwatch}
              className="w-full py-2.5 px-3 rounded-lg bg-primary hover:bg-primary/90 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              <span>Save as Terrain Splat Swatch</span>
            </button>

            <button
              type="button"
              disabled={!selection}
              onClick={handleSaveToPropLibrary}
              className="w-full py-2.5 px-3 rounded-lg bg-[#0d1d36] hover:bg-[#122749] border border-primary/40 text-primary font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TreePine className="w-4 h-4" />
              <span>Save to Prop & Foliage Library</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
