'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  Wand2,
  Trash2
} from 'lucide-react';
import { useGameStore } from '../store';
import { AssetManager } from '@/engine/assets/AssetManager';
import { soundSynth } from '@/engine/sound-synth';
import { listCharacterComponentCategories, CHARACTER_COMPONENT_CATEGORIES, inferCharacterComponentLayerSlot, getDefaultZOrderHint } from '@/shared/game/assetImportProfiles';

type Direction = 'down' | 'left' | 'right' | 'up' | 'attack';

const DIRECTIONS: { id: Direction; label: string; count: number }[] = [
  { id: 'down', label: 'Walk Down (Forward)', count: 4 },
  { id: 'left', label: 'Walk Left', count: 4 },
  { id: 'right', label: 'Walk Right', count: 4 },
  { id: 'up', label: 'Walk Up (Backwards)', count: 4 },
  { id: 'attack', label: 'Attack (Optional)', count: 4 },
];

export function ManualCharacterAssembler() {
  const showToast = useGameStore((s) => s.showToast);

  // Asset Metadata
  const [assetName, setAssetName] = useState('');
  const [isModularComponent, setIsModularComponent] = useState(false);
  const [componentCategory, setComponentCategory] = useState('actor');
  const [componentLayer, setComponentLayer] = useState('full-body');
  const [variantFamily, setVariantFamily] = useState('');
  const [zOrderHint, setZOrderHint] = useState('');
  const [baseBodyType, setBaseBodyType] = useState('');
  const [tagsInput, setTagsInput] = useState('modular, character-sheet');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Frame State
  // frames is an object mapping row to an array of Object URLs (string) or null
  const [frames, setFrames] = useState<Record<Direction, (string | null)[]>>({
    down: [null, null, null, null],
    left: [null, null, null, null],
    right: [null, null, null, null],
    up: [null, null, null, null],
    attack: [null, null, null, null],
  });

  const [frameFiles, setFrameFiles] = useState<Record<Direction, (File | null)[]>>({
    down: [null, null, null, null],
    left: [null, null, null, null],
    right: [null, null, null, null],
    up: [null, null, null, null],
    attack: [null, null, null, null],
  });

  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSlot, setActiveSlot] = useState<{ dir: Direction; index: number } | null>(null);

  const handleSlotClick = (dir: Direction, index: number) => {
    setActiveSlot({ dir, index });
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSlot) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file.');
      return;
    }

    const url = URL.createObjectURL(file);
    
    setFrames((prev) => {
      const next = { ...prev };
      next[activeSlot.dir] = [...next[activeSlot.dir]];
      next[activeSlot.dir][activeSlot.index] = url;
      return next;
    });

    setFrameFiles((prev) => {
      const next = { ...prev };
      next[activeSlot.dir] = [...next[activeSlot.dir]];
      next[activeSlot.dir][activeSlot.index] = file;
      return next;
    });

    // Reset input
    e.target.value = '';
    setActiveSlot(null);
  };

  const handleRemoveFrame = (dir: Direction, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setFrames((prev) => {
      const next = { ...prev };
      next[dir] = [...next[dir]];
      next[dir][index] = null;
      return next;
    });
    setFrameFiles((prev) => {
      const next = { ...prev };
      next[dir] = [...next[dir]];
      next[dir][index] = null;
      return next;
    });
  };

  // Helper to load an image from URL
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const handleAssembleAndUpload = async () => {
    if (!assetName.trim()) {
      setErrorMessage('Please provide an asset name.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      // 1. Gather all images and calculate max dimensions
      let maxWidth = 0;
      let maxHeight = 0;
      
      const loadedImages: Record<Direction, (HTMLImageElement | null)[]> = {
        down: [null, null, null, null],
        left: [null, null, null, null],
        right: [null, null, null, null],
        up: [null, null, null, null],
        attack: [null, null, null, null],
      };

      for (const dir of DIRECTIONS) {
        for (let i = 0; i < dir.count; i++) {
          const url = frames[dir.id][i];
          if (url) {
            const img = await loadImage(url);
            loadedImages[dir.id][i] = img;
            if (img.width > maxWidth) maxWidth = img.width;
            if (img.height > maxHeight) maxHeight = img.height;
          }
        }
      }

      if (maxWidth === 0 || maxHeight === 0) {
        throw new Error('No valid images uploaded. Please add at least one frame.');
      }

      // Determine how many rows we need (do we include attack row?)
      const hasAttack = loadedImages.attack.some((img) => img !== null);
      const rowCount = hasAttack ? 5 : 4;
      const colCount = 4;

      const canvasWidth = maxWidth * colCount;
      const canvasHeight = maxHeight * rowCount;

      const canvas = hiddenCanvasRef.current;
      if (!canvas) throw new Error('Canvas ref missing');

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get 2d context');

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Draw each image centered in its cell
      const drawRow = (dir: Direction, rowIdx: number) => {
        for (let colIdx = 0; colIdx < 4; colIdx++) {
          const img = loadedImages[dir][colIdx];
          if (img) {
            const cellX = colIdx * maxWidth;
            const cellY = rowIdx * maxHeight;
            
            // Center the image within the cell
            const dx = cellX + (maxWidth - img.width) / 2;
            const dy = cellY + (maxHeight - img.height) / 2;
            
            ctx.drawImage(img, dx, dy, img.width, img.height);
          }
        }
      };

      drawRow('down', 0);
      drawRow('left', 1);
      drawRow('right', 2);
      drawRow('up', 3);
      if (hasAttack) {
        drawRow('attack', 4);
      }

      // Export to Blob
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Failed to create PNG blob');

      const finalFile = new File([blob], `${assetName.trim().replace(/\s+/g, '_')}.png`, { type: 'image/png' });

      // 3. Upload to /api/assets/upload
      const formData = new FormData();
      formData.append('file', finalFile);
      formData.append('name', assetName.trim());
      formData.append('type', 'CHARACTER');
      formData.append('importProfile', 'character');
      formData.append('slotRole', 'walk'); // Or component category
      formData.append('animationProfile', 'multi_frame_directional');
      formData.append('sourceMode', 'spritesheet');
      formData.append('category', isModularComponent ? componentCategory : 'actor');

      if (isModularComponent) {
        formData.append('componentCategory', componentCategory);
        formData.append('componentLayer', componentLayer);
        formData.append('isModularComponent', 'true');
        if (variantFamily.trim()) formData.append('variantFamily', variantFamily.trim());
        const effectiveZOrder = zOrderHint.trim() !== '' ? Number(zOrderHint) : getDefaultZOrderHint(componentCategory);
        if (effectiveZOrder !== null && effectiveZOrder !== undefined && !Number.isNaN(effectiveZOrder)) {
          formData.append('zOrderHint', String(effectiveZOrder));
        }
        if (baseBodyType) formData.append('baseBodyType', baseBodyType);
      }

      if (tagsInput.trim()) {
        const tagList = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
        formData.append('tags', JSON.stringify(tagList));
      }

      formData.append('visibility', 'COMMUNITY');
      formData.append('createUsable', 'true');

      const res = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload asset');
      }

      soundSynth?.playSelectSound?.();
      showToast(`Asset built and uploaded: ${assetName}`);
      AssetManager.getInstance().broadcastRefresh();
      setUploadSuccess(data);

    } catch (err: any) {
      console.error('Assembler error:', err);
      setErrorMessage(err.message || 'Asset assembly failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setAssetName('');
    setIsModularComponent(false);
    setComponentCategory('actor');
    setVariantFamily('');
    setBaseBodyType('');
    setTagsInput('modular, character-sheet');
    setFrames({
      down: [null, null, null, null],
      left: [null, null, null, null],
      right: [null, null, null, null],
      up: [null, null, null, null],
      attack: [null, null, null, null],
    });
    setFrameFiles({
      down: [null, null, null, null],
      left: [null, null, null, null],
      right: [null, null, null, null],
      up: [null, null, null, null],
      attack: [null, null, null, null],
    });
    setUploadSuccess(null);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-4 text-xs font-mono text-slate-300 h-full overflow-y-auto pr-2 pb-12">
      {/* HEADER */}
      <div className="bg-[#0b1320]/80 border border-[#cbb26a]/30 rounded p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-[#e2d5b3] font-bold text-sm">
          <Wand2 className="w-4 h-4 text-amber-400" /> Manual Character Assembler
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Upload individual frame images for each direction. The system will auto-align and stitch them into a unified spritesheet (Down, Left, Right, Up).
        </p>
      </div>

      {uploadSuccess ? (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded p-4 text-center space-y-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <div className="text-emerald-200 font-bold text-sm">Spritesheet Assembled & Ingested!</div>
          <div className="text-[11px] text-slate-300">
            Registered into library as <span className="text-amber-300 font-bold">{uploadSuccess.usableAsset?.name || uploadSuccess.asset?.name}</span>.
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold transition-all cursor-pointer"
            >
              Assemble Another
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* LEFT COL: METADATA */}
            <div className="lg:col-span-1 space-y-3">
              <div className="bg-[#050b14] border border-slate-800 rounded p-3 space-y-3">
                <div className="text-[10px] text-amber-300/80 font-bold uppercase tracking-wide">
                  Asset Details
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Asset Name</label>
                  <input
                    type="text"
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    placeholder="e.g. Hero Walk Cycle"
                    className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1.5 text-white text-xs"
                    required
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 text-[11px] text-slate-300 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isModularComponent}
                      onChange={(e) => {
                        setIsModularComponent(e.target.checked);
                      }}
                      className="rounded bg-[#0b1320] border-slate-700 text-amber-500 focus:ring-0"
                    />
                    <span>Upload as Modular Component Layer</span>
                  </label>
                </div>

                {isModularComponent && (
                  <div className="space-y-2 border-t border-slate-800/80 pt-2 mt-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Component Category</label>
                      <select
                        value={componentCategory}
                        onChange={(e) => {
                          const next = e.target.value;
                          setComponentCategory(next);
                          setComponentLayer(inferCharacterComponentLayerSlot(next) || 'full-body');
                        }}
                        className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1.5 text-slate-200 text-xs"
                      >
                        {listCharacterComponentCategories().map((cat) => (
                          <option key={cat} value={cat}>
                            {CHARACTER_COMPONENT_CATEGORIES[cat].label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Variant / Family</label>
                      <input
                        type="text"
                        value={variantFamily}
                        onChange={(e) => setVariantFamily(e.target.value)}
                        placeholder="e.g. Leather Armor"
                        className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1.5 text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Base Body Type (Optional)</label>
                      <input
                        type="text"
                        value={baseBodyType}
                        onChange={(e) => setBaseBodyType(e.target.value)}
                        placeholder="e.g. human_male"
                        className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1.5 text-white text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {errorMessage && (
                <div className="bg-red-950/40 border border-red-500/40 text-red-300 p-3 rounded text-xs">
                  {errorMessage}
                </div>
              )}

              <button
                type="button"
                onClick={handleAssembleAndUpload}
                disabled={isUploading}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded shadow transition-all flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Assembling...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Assemble & Upload</>
                )}
              </button>
            </div>

            {/* RIGHT COL: FRAME BUILDER */}
            <div className="lg:col-span-2 bg-[#050b14] border border-slate-800 rounded p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[10px] text-amber-300/80 font-bold uppercase tracking-wide">
                  Frame Grid Assembler
                </div>
                <div className="text-[10px] text-slate-500">
                  Click a slot to upload an image.
                </div>
              </div>

              <div className="space-y-4">
                {DIRECTIONS.map((dir) => (
                  <div key={dir.id} className="bg-[#0b1320] border border-slate-700/60 rounded p-3">
                    <div className="text-xs font-bold text-slate-300 mb-2">{dir.label}</div>
                    <div className="grid grid-cols-4 gap-2">
                      {Array.from({ length: dir.count }).map((_, i) => {
                        const frameUrl = frames[dir.id][i];
                        return (
                          <div
                            key={i}
                            onClick={() => handleSlotClick(dir.id, i)}
                            className={`relative aspect-square rounded border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                              frameUrl 
                                ? 'border-amber-500/40 bg-black/40 overflow-hidden' 
                                : 'border-slate-700 hover:border-amber-500/60 hover:bg-white/5'
                            }`}
                          >
                            {frameUrl ? (
                              <>
                                <img src={frameUrl} alt={`${dir.id} frame ${i + 1}`} className="w-full h-full object-contain pointer-events-none" />
                                <button
                                  type="button"
                                  onClick={(e) => handleRemoveFrame(dir.id, i, e)}
                                  className="absolute top-1 right-1 p-1 bg-red-600/80 hover:bg-red-500 text-white rounded shadow"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              <div className="flex flex-col items-center text-slate-500">
                                <ImageIcon className="w-4 h-4 mb-1" />
                                <span className="text-[9px]">Frame {i + 1}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
          <canvas ref={hiddenCanvasRef} className="hidden" />
        </>
      )}
    </div>
  );
}
