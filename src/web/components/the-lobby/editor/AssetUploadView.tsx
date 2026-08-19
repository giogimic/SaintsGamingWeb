'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Music,
  Box,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Package,
  Wand2,
  Scissors,
  Layers,
  Sparkles,
  Info,
  ExternalLink,
} from 'lucide-react';
import { useGameStore } from '../store';
import { soundSynth } from '@/engine/sound-synth';
import { AssetManager } from '@/engine/assets/AssetManager';
import {
  ASSET_IMPORT_PROFILE_META,
  AssetImportProfileId,
  CHARACTER_COMPONENT_CATEGORIES,
  getDefaultSlotRole,
  getDefaultZOrderHint,
  inferCategoryForRole,
  inferCharacterComponentLayerSlot,
  inferTypeForProfile,
  isCharacterComponentCategory,
  isValidSlotRole,
  listAssetImportProfiles,
  listCharacterBaseBodyTypes,
  listCharacterComponentCategories,
  listSlotRolesForProfile,
} from '@/shared/game/assetImportProfiles';
import {
  detectLpcFormat,
  LpcDetectedFormat,
  unpackLpcZipPackage,
  UnpackedLpcPackage,
  UnpackedLpcLayer,
} from '@/shared/game/lpcPackage';
import {
  ANIMATION_PROFILES,
  SpriteAnimationProfile,
  resolveSpriteDefinition,
} from '@/shared/game/spriteDefinitions';

const ASSET_TYPES = [
  { value: 'OBJECT', label: 'Object / Prop (Furniture, Trees, Rocks)', icon: Box },
  { value: 'CHARACTER', label: 'Character / Hero / NPC', icon: ImageIcon },
  { value: 'CREATURE', label: 'Creature / Monster', icon: ImageIcon },
  { value: 'TILE', label: 'Tile / Terrain Patch', icon: Box },
  { value: 'ITEM', label: 'Inventory Item / Gear Icon', icon: Box },
  { value: 'UI', label: 'UI Element / Frame / Icon', icon: Box },
  { value: 'EFFECT', label: 'Visual Effect / Particle', icon: SparklesIcon },
  { value: 'AUDIO', label: 'Sound Effect / Music Track', icon: Music },
];

function SparklesIcon(props: any) {
  return <ImageIcon {...props} />;
}

export function AssetUploadView({
  initialAssetType,
  initialImportProfile,
  onUploadComplete,
  onOpenSlicer,
}: {
  initialAssetType?: string;
  initialImportProfile?: AssetImportProfileId | '';
  onUploadComplete?: (asset: any) => void;
  onOpenSlicer?: (asset: { id: string; filename: string; storagePath: string }) => void;
}) {
  const showToast = useGameStore((s) => s.showToast);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState(initialAssetType || 'OBJECT');
  const [category, setCategory] = useState('');
  const [componentCategory, setComponentCategory] = useState('');
  const [componentLayer, setComponentLayer] = useState('');
  const [variantFamily, setVariantFamily] = useState('');
  const [isModularComponent, setIsModularComponent] = useState(false);
  const [zOrderHint, setZOrderHint] = useState('');
  const [baseBodyType, setBaseBodyType] = useState('');
  const [hidesComponents, setHidesComponents] = useState<string[]>([]);
  const [bodyTypeWarning, setBodyTypeWarning] = useState<string | null>(null);
  const [importProfile, setImportProfile] = useState<AssetImportProfileId | ''>(initialImportProfile || '');

  useEffect(() => {
    if (initialAssetType) setAssetType(initialAssetType);
  }, [initialAssetType]);

  useEffect(() => {
    if (initialImportProfile) setImportProfile(initialImportProfile);
  }, [initialImportProfile]);
  const [slotRole, setSlotRole] = useState('');
  const [animationProfile, setAnimationProfile] = useState<SpriteAnimationProfile | ''>('');
  const [tagsInput, setTagsInput] = useState('');
  const [visibility, setVisibility] = useState('COMMUNITY');
  const [createUsable, setCreateUsable] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // LPC Detection & ZIP Package State
  const [detectedLpc, setDetectedLpc] = useState<LpcDetectedFormat | null>(null);
  const [unpackedZip, setUnpackedZip] = useState<UnpackedLpcPackage | null>(null);
  const [isUnpackingZip, setIsUnpackingZip] = useState(false);
  const [batchImportProgress, setBatchImportProgress] = useState<{ current: number; total: number } | null>(null);

  // Warn when baseBodyType conflicts with other assets sharing the same variantFamily
  useEffect(() => {
    if (!isModularComponent || !variantFamily.trim() || !baseBodyType) {
      setBodyTypeWarning(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const manager = AssetManager.getInstance();
        const { items } = await manager.searchAssets({ variantFamily: variantFamily.trim() }, 0, 25);
        if (cancelled) return;

        const conflicting = items
          .map((item) => (item.metadata?.baseBodyType || item.baseBodyType || '').toString().toLowerCase())
          .filter((bt) => bt && bt !== baseBodyType.toLowerCase());

        if (conflicting.length > 0) {
          const uniqueTypes = Array.from(new Set(conflicting));
          setBodyTypeWarning(
            `⚠️ ${conflicting.length} existing asset(s) tagged "${variantFamily.trim()}" use a different body type (${uniqueTypes.join(', ')}). This piece is "${baseBodyType}" — sprites may not align.`
          );
        } else {
          setBodyTypeWarning(null);
        }
      } catch {
        // Non-critical check
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isModularComponent, variantFamily, baseBodyType]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setUploadSuccess(null);

    // If a ZIP package is dropped/selected (e.g. from Universal LPC Generator)
    if (file.name.toLowerCase().endsWith('.zip') || file.type.includes('zip')) {
      await handleZipUpload(file);
      return;
    }

    setSelectedFile(file);
    setUnpackedZip(null);

    // Default asset name from file
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    if (!assetName) {
      setAssetName(cleanName);
    }

    // Auto-detect audio
    if (!importProfile && file.type.startsWith('audio/')) {
      setAssetType('AUDIO');
    }

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // Measure dimensions to detect LPC layout & animation profile
      const img = new Image();
      img.onload = () => {
        const format = detectLpcFormat(img.naturalWidth, img.naturalHeight);
        const resolved = resolveSpriteDefinition({
          width: img.naturalWidth,
          height: img.naturalHeight,
          spriteUrl: url,
        });
        setAnimationProfile(resolved.profile);

        if (format.isLpc) {
          setDetectedLpc(format);
          if (!importProfile) {
            setImportProfile('character');
            setSlotRole('walk');
            setAssetType('CHARACTER');
            setCategory('actor');
          }
        } else {
          setDetectedLpc(null);
        }
      };
      img.src = url;
    } else {
      setPreviewUrl(null);
      setDetectedLpc(null);
      setAnimationProfile('');
    }
  };

  const handleZipUpload = async (zipFile: File) => {
    setIsUnpackingZip(true);
    setErrorMessage(null);
    try {
      const pkg = await unpackLpcZipPackage(zipFile);
      setUnpackedZip(pkg);

      if (pkg.compositeFile) {
        setSelectedFile(pkg.compositeFile);
        setPreviewUrl(pkg.compositePreviewUrl || null);
        setAssetName(pkg.presetName || zipFile.name.replace(/\.zip$/i, ''));
        setAssetType('CHARACTER');
        setImportProfile('character');
        setSlotRole('walk');
        setCategory('actor');
        setAnimationProfile('lpc-full');
        if (pkg.baseBodyType) {
          setBaseBodyType(pkg.baseBodyType);
        }

        const tagList = ['lpc', 'lpc-studio-export', 'spritesheet', 'character', 'anim:lpc-full'];
        if (pkg.presetName) tagList.push(pkg.presetName.toLowerCase().replace(/\s+/g, '-'));
        if (pkg.baseBodyType) tagList.push(`body:${pkg.baseBodyType}`);
        setTagsInput(tagList.join(', '));

        const detected = detectLpcFormat(832, 1344);
        setDetectedLpc(detected);
        showToast(`Unpacked LPC Character Package: ${pkg.layers.length} modular layers found!`);
      } else {
        showToast(`Unpacked ZIP: ${pkg.layers.length} layers found.`);
      }
    } catch (err: any) {
      console.error('Failed to unpack LPC ZIP:', err);
      setErrorMessage(`Failed to unpack LPC ZIP file: ${err.message || 'Invalid archive'}`);
    } finally {
      setIsUnpackingZip(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (fileInputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInputRef.current.files = dt.files;
      }
      void handleFileChange({ target: { files: [file] } } as any);
    }
  };

  const applyLpcPreset = (preset: 'character' | 'walk' | '2.5d') => {
    setImportProfile('character');
    setSlotRole('walk');
    setAssetType('CHARACTER');
    setCategory('actor');
    setIsModularComponent(false);
    setComponentCategory('');
    setComponentLayer('');
    setVariantFamily('');
    setZOrderHint('');

    const presetTags =
      preset === 'walk'
        ? ['lpc', 'walk-cycle', 'spritesheet']
        : preset === '2.5d'
        ? ['lpc', 'saints-2.5d', 'walk-grid', 'spritesheet']
        : ['lpc', 'spritesheet', 'character-sheet', 'full-animation'];

    setTagsInput((prev) => {
      const tokens = prev.split(',').map((v) => v.trim()).filter(Boolean);
      const next = Array.from(new Set([...tokens, ...presetTags]));
      return next.join(', ');
    });

    soundSynth?.playSelectSound?.();
    showToast(`Applied ${preset === '2.5d' ? 'Saints 2.5D' : 'LPC'} character preset!`);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', assetName.trim() || selectedFile.name);
      formData.append('type', assetType);
      if (importProfile) formData.append('importProfile', importProfile);
      if (slotRole) formData.append('slotRole', slotRole);
      if (animationProfile) formData.append('animationProfile', animationProfile);
      formData.append('sourceMode', detectedLpc?.isLpc ? 'spritesheet' : 'single');
      if (category.trim()) formData.append('category', category.trim().toLowerCase());

      if (isModularComponent) {
        const normalizedComponentCategory = componentCategory || category || 'other';
        const normalizedComponentLayer =
          componentLayer || inferCharacterComponentLayerSlot(normalizedComponentCategory) || 'full-body';
        formData.append('componentCategory', normalizedComponentCategory.toLowerCase());
        formData.append('componentLayer', normalizedComponentLayer.toLowerCase());
        formData.append('isModularComponent', 'true');
        if (variantFamily.trim()) formData.append('variantFamily', variantFamily.trim());
        const effectiveZOrder =
          zOrderHint.trim() !== '' ? Number(zOrderHint) : getDefaultZOrderHint(normalizedComponentCategory);
        if (effectiveZOrder !== null && effectiveZOrder !== undefined && !Number.isNaN(effectiveZOrder)) {
          formData.append('zOrderHint', String(effectiveZOrder));
        }
        if (baseBodyType) formData.append('baseBodyType', baseBodyType);
        if (hidesComponents.length > 0) formData.append('hidesComponents', JSON.stringify(hidesComponents));
      }

      if (tagsInput.trim()) {
        const tagList = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
        formData.append('tags', JSON.stringify(tagList));
      }

      formData.append('visibility', visibility);
      formData.append('createUsable', String(createUsable));

      const res = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload asset');
      }

      soundSynth?.playSelectSound?.();
      showToast(`Asset ingested: ${assetName || selectedFile.name}`);
      AssetManager.getInstance().broadcastRefresh();
      setUploadSuccess(data);
      if (onUploadComplete) onUploadComplete(data);
    } catch (err: any) {
      console.error('Asset upload error:', err);
      setErrorMessage(err.message || 'Asset upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  /** Ingests all unpacked modular layers from an LPC ZIP package as modular assets */
  const handleBatchIngestLayers = async () => {
    if (!unpackedZip || unpackedZip.layers.length === 0) return;

    setIsUploading(true);
    setErrorMessage(null);
    let successCount = 0;
    const total = unpackedZip.layers.length;

    try {
      for (let i = 0; i < total; i++) {
        const layer = unpackedZip.layers[i];
        setBatchImportProgress({ current: i + 1, total });

        const formData = new FormData();
        formData.append('file', layer.file);
        formData.append('name', `${unpackedZip.presetName || 'LPC'} — ${layer.name}`);
        formData.append('type', 'CHARACTER');
        formData.append('importProfile', 'character');
        formData.append('slotRole', layer.componentCategory);
        formData.append('animationProfile', 'lpc-full');
        formData.append('category', layer.componentCategory);
        formData.append('componentCategory', layer.componentCategory);
        formData.append('componentLayer', layer.componentLayer);
        formData.append('isModularComponent', 'true');
        formData.append('variantFamily', unpackedZip.presetName || 'LPC Variant');
        formData.append('zOrderHint', String(layer.zOrderHint));
        if (layer.baseBodyType || unpackedZip.baseBodyType) {
          formData.append('baseBodyType', (layer.baseBodyType || unpackedZip.baseBodyType)!);
        }
        formData.append(
          'tags',
          JSON.stringify([
            'lpc',
            'modular',
            'sprite-component',
            'anim:lpc-full',
            `component:${layer.componentCategory}`,
            `layer:${layer.componentLayer}`,
          ])
        );
        formData.append('visibility', visibility);
        formData.append('createUsable', 'true');

        const res = await fetch('/api/assets/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          successCount++;
        }
      }

      soundSynth?.playSelectSound?.();
      showToast(`Batch Ingested ${successCount}/${total} Modular LPC Layers!`);
      AssetManager.getInstance().broadcastRefresh();
      setUploadSuccess({
        message: `Successfully ingested ${successCount} modular character layers into the asset library.`,
      });
    } catch (err: any) {
      console.error('Batch layer upload failed:', err);
      setErrorMessage(`Batch upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
      setBatchImportProgress(null);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAssetName('');
    setImportProfile('');
    setSlotRole('');
    setAnimationProfile('');
    setCategory('');
    setComponentCategory('');
    setComponentLayer('');
    setVariantFamily('');
    setIsModularComponent(false);
    setZOrderHint('');
    setBaseBodyType('');
    setHidesComponents([]);
    setTagsInput('');
    setDetectedLpc(null);
    setUnpackedZip(null);
    setUploadSuccess(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (zipInputRef.current) zipInputRef.current.value = '';
  };

  return (
    <div className="space-y-4 text-xs font-mono text-slate-300">
      {/* HEADER */}
      <div className="bg-[#0b1320]/80 border border-[#cbb26a]/30 rounded p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-[#e2d5b3] font-bold text-sm">
          <Upload className="w-4 h-4 text-amber-400" /> Asset Ingestion & LPC Studio Upload Pipeline
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Upload individual sprites, LPC character generator outputs (PNG or ZIP packages with layers & credits),
          tilesets, or audio files into the unified game library.
        </p>
      </div>

      {/* LPC SMART DETECTION / PRESETS BANNER */}
      <div className="bg-[#07111c] border border-cyan-500/30 rounded p-3 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1 max-w-[44rem]">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-sm">
              <Wand2 className="w-4 h-4 text-cyan-400" /> Universal LPC Character Studio Ingestion
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Drop any spritesheet PNG or LPC Generator export ZIP. Slices and modular layers are extracted
              automatically with full author credits intact.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => applyLpcPreset('character')}
              className="px-3 py-1.5 rounded bg-cyan-800 hover:bg-cyan-700 text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" /> Full LPC Preset
            </button>
            <button
              type="button"
              onClick={() => applyLpcPreset('walk')}
              className="px-3 py-1.5 rounded bg-cyan-900/80 hover:bg-cyan-800 text-cyan-200 font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              Walk Cycle (4-Dir)
            </button>
            <button
              type="button"
              onClick={() => applyLpcPreset('2.5d')}
              className="px-3 py-1.5 rounded bg-amber-700/80 hover:bg-amber-600 text-amber-100 font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              Saints 2.5D (3x4)
            </button>
          </div>
        </div>

        {detectedLpc && (
          <div className="bg-cyan-950/40 border border-cyan-500/40 rounded p-2.5 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <div className="text-cyan-200 font-bold text-xs">{detectedLpc.label}</div>
                <div className="text-[10px] text-slate-400">{detectedLpc.description}</div>
              </div>
            </div>

            {uploadSuccess?.sourceAsset && onOpenSlicer && (
              <button
                type="button"
                onClick={() => onOpenSlicer(uploadSuccess.sourceAsset)}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5" /> Open in Slicer
              </button>
            )}
          </div>
        )}

        {/* UNPACKED ZIP PACKAGE SUMMARY */}
        {unpackedZip && (
          <div className="bg-black/50 border border-emerald-500/40 rounded p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                <Package className="w-4 h-4 text-emerald-400" />
                <span>
                  Unpacked LPC Package: {unpackedZip.presetName} ({unpackedZip.layers.length} modular layers)
                </span>
              </div>
              <button
                type="button"
                onClick={handleBatchIngestLayers}
                disabled={isUploading}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> Ingesting Layers...
                  </>
                ) : (
                  <>
                    <Layers className="w-3 h-3" /> Ingest All {unpackedZip.layers.length} Modular Layers
                  </>
                )}
              </button>
            </div>

            {/* Layer preview thumbnails */}
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {unpackedZip.layers.map((layer, idx) => (
                <div
                  key={idx}
                  className="bg-[#0b1320] border border-slate-700 rounded p-1.5 shrink-0 flex flex-col items-center gap-1 text-[10px] w-24"
                >
                  <img src={layer.previewUrl} alt={layer.name} className="w-12 h-12 object-contain bg-black/40 rounded" />
                  <span className="truncate w-full text-center text-slate-300">{layer.name}</span>
                  <span className="text-[9px] text-amber-400 font-bold uppercase">{layer.componentCategory}</span>
                </div>
              ))}
            </div>

            {/* Credits preview */}
            {unpackedZip.credits.length > 0 && (
              <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-2 space-y-1">
                <div className="text-slate-300 font-bold">Attributions ({unpackedZip.credits.length}):</div>
                <div className="max-h-20 overflow-y-auto space-y-0.5 pr-1">
                  {unpackedZip.credits.map((c, i) => (
                    <div key={i} className="text-[9px] text-slate-400 truncate">
                      • {c.fileName || 'Layer'}: {c.authors.join(', ')} ({c.licenses.join(', ')})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {uploadSuccess ? (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded p-4 text-center space-y-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <div className="text-emerald-200 font-bold text-sm">Asset Successfully Ingested!</div>
          <div className="text-[11px] text-slate-300">
            Source file recorded as{' '}
            <span className="text-amber-300 font-bold">{uploadSuccess.sourceAsset?.filename}</span>
            {uploadSuccess.usableAsset && (
              <>
                {' '}
                and registered into library as{' '}
                <span className="text-amber-300 font-bold">{uploadSuccess.usableAsset?.name}</span> (
                {uploadSuccess.usableAsset?.type}).
              </>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold transition-all cursor-pointer"
            >
              Upload Another Asset
            </button>
            {uploadSuccess.sourceAsset && onOpenSlicer && (
              <button
                type="button"
                onClick={() => onOpenSlicer(uploadSuccess.sourceAsset)}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Scissors className="w-4 h-4" /> Open in Spritesheet Slicer
              </button>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleUploadSubmit} className="space-y-3">
          {/* DROPZONE */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded p-4 text-center cursor-pointer transition-all ${
              selectedFile
                ? 'border-amber-500/60 bg-amber-950/20'
                : 'border-slate-700 hover:border-amber-500/40 bg-[#050b14]/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/webp,image/gif,application/zip,.zip,audio/mpeg,audio/wav,audio/ogg"
              className="hidden"
            />
            {previewUrl ? (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-28 max-w-full object-contain rounded border border-slate-700 bg-black/40 p-1"
                />
                <span className="text-[10px] text-amber-300 font-bold">
                  {selectedFile?.name} ({((selectedFile?.size || 0) / 1024).toFixed(1)} KB)
                </span>
              </div>
            ) : selectedFile ? (
              <div className="flex flex-col items-center gap-1.5">
                <Music className="w-8 h-8 text-amber-400" />
                <span className="text-[11px] text-white font-bold">{selectedFile.name}</span>
                <span className="text-[10px] text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-2">
                <Upload className="w-6 h-6 text-slate-400" />
                <div className="text-slate-200 font-bold text-[11px]">
                  Click or drag & drop asset file or LPC ZIP export here
                </div>
                <div className="text-[10px] text-slate-500">
                  Supports PNG, LPC Spritesheet ZIP packages, WebP, GIF, MP3, WAV, OGG
                </div>
              </div>
            )}
          </div>

          {/* ASSET METADATA FIELDS */}
          <div className="bg-[#050b14] border border-slate-800 rounded p-3 space-y-2.5">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Asset Name</label>
              <input
                type="text"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="e.g. Ancient Oak Tree or Paladin Hero"
                className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-white text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className="flex items-center gap-2 text-[11px] text-slate-300 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isModularComponent}
                    onChange={(e) => {
                      setIsModularComponent(e.target.checked);
                      if (e.target.checked && !componentCategory && category) {
                        setComponentCategory(category);
                      }
                    }}
                    className="rounded bg-[#0b1320] border-slate-700 text-amber-500 focus:ring-0"
                  />
                  <span>Upload as modular character sprite component</span>
                </label>
              </div>

              {isModularComponent && (
                <>
                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-400 mb-1">Component Category</label>
                    <select
                      value={componentCategory || category || 'hair'}
                      onChange={(e) => {
                        const next = e.target.value;
                        setComponentCategory(next);
                        setCategory(next);
                        setAssetType('CHARACTER');
                      }}
                      className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                    >
                      {listCharacterComponentCategories().map((component) => (
                        <option key={component} value={component}>
                          {CHARACTER_COMPONENT_CATEGORIES[component].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-400 mb-1">Body Layer</label>
                    <select
                      value={
                        componentLayer ||
                        inferCharacterComponentLayerSlot(componentCategory || category || 'other') ||
                        'full-body'
                      }
                      onChange={(e) => setComponentLayer(e.target.value)}
                      className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                    >
                      {['head', 'torso', 'legs', 'feet', 'accessory', 'full-body'].map((layer) => (
                        <option key={layer} value={layer}>
                          {layer.replace('-', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-400 mb-1">Variant / Family</label>
                    <input
                      type="text"
                      value={variantFamily}
                      onChange={(e) => setVariantFamily(e.target.value)}
                      placeholder="e.g. Long Hair, Red, Wizard Hat"
                      className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-white text-xs"
                    />
                  </div>

                  {/* Compositing Rules */}
                  <div className="col-span-2 border-t border-slate-800 pt-2 mt-1 space-y-2">
                    <div className="text-[10px] text-amber-300/80 font-bold uppercase tracking-wide">
                      Compositing Rules
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Z-Order (draw order)</label>
                        <input
                          type="number"
                          value={zOrderHint}
                          onChange={(e) => setZOrderHint(e.target.value)}
                          placeholder={String(getDefaultZOrderHint(componentCategory || category || 'other') ?? 'auto')}
                          className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Base Body Type</label>
                        <select
                          value={baseBodyType}
                          onChange={(e) => setBaseBodyType(e.target.value)}
                          className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                        >
                          <option value="">Unspecified / Any</option>
                          {listCharacterBaseBodyTypes()
                            .filter((bodyType) => bodyType !== 'unspecified')
                            .map((bodyType) => (
                              <option key={bodyType} value={bodyType}>
                                {bodyType.charAt(0).toUpperCase() + bodyType.slice(1)}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">
                        Hides these layers when equipped
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {listCharacterComponentCategories()
                          .filter((c) => c !== (componentCategory || category))
                          .map((c) => (
                            <label
                              key={c}
                              className="flex items-center gap-1 text-[10px] text-slate-300 bg-[#0b1320] border border-slate-700 rounded px-2 py-1 cursor-pointer select-none"
                            >
                              <input
                                type="checkbox"
                                checked={hidesComponents.includes(c)}
                                onChange={(e) => {
                                  setHidesComponents((prev) =>
                                    e.target.checked ? [...prev, c] : prev.filter((v) => v !== c)
                                  );
                                }}
                                className="rounded bg-[#0b1320] border-slate-700 text-amber-500 focus:ring-0"
                              />
                              {CHARACTER_COMPONENT_CATEGORIES[c].label}
                            </label>
                          ))}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        e.g. a closed helm hides Hair, Hat, Head Accessory.
                      </div>
                    </div>

                    {bodyTypeWarning && (
                      <div className="flex items-start gap-1.5 bg-amber-950/40 border border-amber-500/40 rounded px-2 py-1.5 text-[10px] text-amber-200">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{bodyTypeWarning}</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Import Profile</label>
                <select
                  value={importProfile}
                  onChange={(e) => {
                    const nextProfile = e.target.value as AssetImportProfileId | '';
                    setImportProfile(nextProfile);
                    if (!nextProfile) {
                      setSlotRole('');
                      return;
                    }

                    const inferredType = inferTypeForProfile(nextProfile);
                    setAssetType(inferredType);
                    const nextRole = getDefaultSlotRole(nextProfile);
                    setSlotRole(nextRole);

                    if (!category.trim()) {
                      const inferredCategory = inferCategoryForRole(nextRole);
                      if (inferredCategory) {
                        setCategory(inferredCategory);
                      }
                    }
                  }}
                  className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                >
                  <option value="">None (legacy/manual)</option>
                  {listAssetImportProfiles().map((profile) => (
                    <option key={profile} value={profile}>
                      {ASSET_IMPORT_PROFILE_META[profile].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1 flex items-center justify-between">
                  <span>Animation Profile</span>
                  {animationProfile && (
                    <span className="text-cyan-400 text-[9px] font-bold">
                      {ANIMATION_PROFILES[animationProfile as SpriteAnimationProfile]?.label || animationProfile}
                    </span>
                  )}
                </label>
                <select
                  value={animationProfile}
                  onChange={(e) => setAnimationProfile(e.target.value as SpriteAnimationProfile | '')}
                  className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                >
                  <option value="">Auto-Detect (from sheet format)</option>
                  <option value="lpc-full">Universal LPC Full Sheet (13x21 · 64x64)</option>
                  <option value="lpc-walk">LPC Walk Cycle (9x4 · 64x64)</option>
                  <option value="tuxemon-3x4">Tuxemon Classic (3x4 · 32x32)</option>
                  <option value="portrait-1x1">Single Frame Portrait / Billboard (1x1)</option>
                  <option value="custom">Custom Grid</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Slot Role</label>
                <select
                  value={slotRole}
                  onChange={(e) => {
                    const nextRole = e.target.value;
                    setSlotRole(nextRole);
                    if (nextRole && !category.trim()) {
                      const inferredCategory = inferCategoryForRole(nextRole);
                      if (inferredCategory) {
                        setCategory(inferredCategory);
                      }
                    }
                  }}
                  disabled={!importProfile}
                  className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs disabled:opacity-50"
                >
                  {!importProfile && <option value="">Select profile first</option>}
                  {importProfile &&
                    listSlotRolesForProfile(importProfile).map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Asset Classification</label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value)}
                  className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                >
                  {ASSET_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Category / Sub-type</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. actor, vegetation, prop, weapon"
                  className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-white text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Search Tags (comma-separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. lpc, character, hero, male, armor"
                className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-white text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Visibility Level</label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="w-full bg-[#0b1320] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                >
                  <option value="COMMUNITY">🌐 Community (Shared)</option>
                  <option value="PUBLIC">⭐ Public (Universal)</option>
                  <option value="PROJECT">📁 Project / Realm Only</option>
                  <option value="PERSONAL">🔒 Personal (Private)</option>
                </select>
              </div>

              <div className="flex items-center pt-4">
                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={createUsable}
                    onChange={(e) => setCreateUsable(e.target.checked)}
                    className="rounded bg-[#0b1320] border-slate-700 text-amber-500 focus:ring-0"
                  />
                  <span>Create usable library entry</span>
                </label>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-rose-950/40 border border-rose-500/40 rounded p-2 text-rose-300 text-[11px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isUploading || !selectedFile}
            className={`w-full py-2 rounded font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isUploading || !selectedFile
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_15px_rgba(217,119,6,0.3)]'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Ingesting Asset...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Ingest Asset to Library
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
