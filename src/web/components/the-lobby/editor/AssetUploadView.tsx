'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Search,
  RefreshCw,
  Filter,
  Cuboid,
  User,
  Users,
  Shirt,
  Sword,
  Crosshair,
  PawPrint,
  Film,
  Activity,
  Check,
  Plus,
  Eye,
  FileArchive,
  Grid,
  List,
  ChevronRight,
  Puzzle,
  FileUp,
  X,
  Copy,
} from 'lucide-react';
import { useGameStore } from '../store';
import { useEditorStore } from './editor-store';
import { soundSynth } from '@/engine/sound-synth';
import { AssetManager, GameAssetItem } from '@/engine/assets/AssetManager';
import { convertFbxToGlb } from '@/web/lib/fbxConverter';
import {
  isZip3DModelPackage,
  unpack3DModelZipPackage,
  convertObjToGlb,
  convertGltfToGlb,
  convertVoxToGlb,
  convertDaeToGlb,
  convertStlToGlb,
  convertPlyToGlb,
} from '@/web/lib/modelPackage';
import JSZip from 'jszip';
import {
  unpackModularZipPackage,
  UnpackedModularPackage,
} from '@/shared/game/modularSpritePackage';
import { AssetDefinitionStudio } from './asset-studio/AssetDefinitionStudio';
import type { DetectedAssetCategory } from '@/web/lib/assetTaxonomy';
import { isAnimationFileName } from '@/shared/game/modelRigTaxonomy';

export interface AssetUploadViewProps {
  initialAssetType?: string;
  initialImportProfile?: any;
  initialSlotRole?: string;
  initialTab?: 'upload' | 'library';
  onSelectModel?: (assetId: string, asset?: any) => void;
  onUploadComplete?: (asset: any) => void;
  onOpenSlicer?: (asset: { id: string; filename: string; storagePath: string }) => void;
}

function getAssetName(asset: GameAssetItem): string {
  return (asset as any).name || asset.metadata?.name || asset.source?.split('/').pop()?.replace(/\.[^/.]+$/, '') || asset.id;
}

export function AssetUploadView({
  initialAssetType,
  initialImportProfile,
  initialSlotRole,
  initialTab,
  onSelectModel,
  onUploadComplete,
  onOpenSlicer,
}: AssetUploadViewProps) {
  const showToast = useGameStore((s) => s.showToast);
  const activeAssetPicker = useEditorStore((s) => s.activeAssetPicker);
  const closeAssetPicker = useEditorStore((s) => s.closeAssetPicker);

  // Active Tab: default to library if in picker mode or initialTab is library
  const [activeTab, setActiveTab] = useState<'upload' | 'library'>(
    initialTab || (activeAssetPicker ? 'library' : 'upload')
  );

  // When activeAssetPicker changes, switch to library mode
  useEffect(() => {
    if (activeAssetPicker) {
      setActiveTab('library');
    }
  }, [activeAssetPicker]);

  // File Inputs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [companionAnimationFiles, setCompanionAnimationFiles] = useState<File[]>([]);
  const [companionTextureFiles, setCompanionTextureFiles] = useState<File[]>([]);
  const [companionModularFiles, setCompanionModularFiles] = useState<File[]>([]);
  const [intentHint, setIntentHint] = useState<DetectedAssetCategory | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<any | null>(null);
  const [unpackedZip, setUnpackedZip] = useState<UnpackedModularPackage | null>(null);

  // Library State
  const [libraryAssets, setLibraryAssets] = useState<GameAssetItem[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [libraryCategoryFilter, setLibraryCategoryFilter] = useState<'ALL' | 'CHARACTERS' | 'MODULAR' | 'WEAPONS' | 'CREATURES' | 'PROPS' | '2D'>('ALL');
  const [totalLibraryCount, setTotalLibraryCount] = useState(0);
  const [previewingAsset, setPreviewingAsset] = useState<GameAssetItem | null>(null);

  // Fetch Library Assets
  const fetchLibrary = async () => {
    setIsLoadingLibrary(true);
    try {
      const typeFilter = activeAssetPicker?.filterType || (libraryCategoryFilter === '2D' ? 'CHARACTER' : 'MODEL');
      const manager = AssetManager.getInstance();
      const res = await manager.searchAssets(
        {
          type: typeFilter as any,
          query: searchQuery || undefined,
        },
        0,
        100
      );
      setLibraryAssets(res.items || []);
      setTotalLibraryCount(res.total || res.items?.length || 0);
    } catch (err) {
      console.warn('Failed to fetch library assets:', err);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'library') {
      void fetchLibrary();
    }
  }, [activeTab, libraryCategoryFilter, activeAssetPicker?.filterType]);

  // Handle Intent Button Clicks
  const handleIntentClick = (intent: DetectedAssetCategory | '2d_sprite' | 'animation_pack') => {
    soundSynth?.playUiClick?.();
    if (intent === '2d_sprite') {
      setIntentHint(undefined);
      if (fileInputRef.current) {
        fileInputRef.current.accept = '.png,.jpg,.jpeg,.webp,.zip';
        fileInputRef.current.click();
      }
    } else if (intent === 'animation_pack') {
      setIntentHint('complete_character');
      if (fileInputRef.current) {
        fileInputRef.current.accept = '.fbx,.glb,.gltf';
        fileInputRef.current.click();
      }
    } else {
      setIntentHint(intent);
      if (fileInputRef.current) {
        fileInputRef.current.accept = '.fbx,.glb,.gltf,.obj,.vox,.dae,.stl,.ply,.zip,.png,.jpg,.jpeg,.webp,.tga,.dds,.bmp,.mtl';
        fileInputRef.current.click();
      }
    }
  };

  // Main Multi-file / Single-file Ingestion Processor
  const handleFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);
    setUploadSuccess(null);
    setIsProcessing(true);

    try {
      // 1. If single ZIP archive dropped
      if (files.length === 1 && (files[0].name.toLowerCase().endsWith('.zip') || files[0].type.includes('zip'))) {
        setProcessingStatus('Inspecting ZIP archive contents...');
        const zipFile = files[0];
        const zip = await JSZip.loadAsync(zipFile);
        const entries = Object.keys(zip.files);

        if (isZip3DModelPackage(entries)) {
          setProcessingStatus('Unpacking 3D model archive with textures, modular items & animations...');
          const unpacked = await unpack3DModelZipPackage(zipFile);
          setSelectedFile(unpacked.primaryModelFile);
          setPreviewUrl(unpacked.previewUrl);
          setCompanionTextureFiles(unpacked.textureFiles || []);
          setCompanionAnimationFiles(unpacked.animationFiles || []);
          setCompanionModularFiles(unpacked.modularPieceFiles || []);
          showToast?.(`Extracted 3D model with ${unpacked.textureCount} textures, ${unpacked.modularPieceFiles?.length || 0} modular pieces, and ${unpacked.animationFiles.length} animations!`);
          setIsProcessing(false);
          setProcessingStatus(null);
          return;
        }

        // Otherwise check for 2D modular sprite package
        setProcessingStatus('Unpacking 2D modular sprite package...');
        const modularPkg = await unpackModularZipPackage(zipFile);
        if (modularPkg && modularPkg.layers.length > 0) {
          setUnpackedZip(modularPkg);
          showToast?.(`Unpacked modular package with ${modularPkg.layers.length} layers!`);
          setIsProcessing(false);
          setProcessingStatus(null);
          return;
        }
      }

      // 2. If multiple files dropped together (e.g. OBJ + MTL + Textures or FBX + Modular Pieces + Textures)
      if (files.length > 1) {
        setProcessingStatus(`Processing ${files.length} dropped asset files...`);
        const isAnimFileName = (name: string) => isAnimationFileName(name);

        const isModularPieceName = (name: string) =>
          /hair|beard|hat|helmet|shirt|t_shirt|top|torso|jacket|armor|pant|leg|short|shoe|boot|sneaker|slipper|glove|hand|gauntlet|glass|face|emotion|cloth|cape|cloak|wing|weapon|sword|shield/i.test(name);

        const isPrimaryBodyName = (name: string) =>
          /body|base|character|hero|full|creative_character|skeleton/i.test(name) && !isModularPieceName(name);

        const all3dFiles = files.filter((f) => /\.(fbx|glb|gltf|obj|vox|dae|stl|ply)$/i.test(f.name));
        const textureFiles = files.filter((f) => /\.(png|jpe?g|webp|tga|dds|bmp)$/i.test(f.name));
        const mtlFile = files.find((f) => f.name.toLowerCase().endsWith('.mtl'));
        const binFiles = files.filter((f) => f.name.toLowerCase().endsWith('.bin'));

        let primaryFile = all3dFiles.find((f) => isPrimaryBodyName(f.name));
        if (!primaryFile) {
          const nonAnims = all3dFiles.filter((f) => !isAnimFileName(f.name));
          primaryFile = nonAnims[0] || all3dFiles[0];
        }

        const animFiles = all3dFiles.filter((f) => f !== primaryFile && isAnimFileName(f.name));
        const rawModularFiles = all3dFiles.filter((f) => f !== primaryFile && !isAnimFileName(f.name));

        // Convert modular pieces with textures attached
        const convertedModularFiles: File[] = [];
        for (const rawMod of rawModularFiles) {
          const lower = rawMod.name.toLowerCase();
          try {
            if (lower.endsWith('.fbx')) {
              convertedModularFiles.push(await convertFbxToGlb(rawMod, { textureFiles }));
            } else if (lower.endsWith('.obj')) {
              convertedModularFiles.push(await convertObjToGlb(rawMod, { mtlFile, textureFiles }));
            } else if (lower.endsWith('.dae')) {
              convertedModularFiles.push(await convertDaeToGlb(rawMod, { textureFiles }));
            } else if (lower.endsWith('.gltf')) {
              convertedModularFiles.push(await convertGltfToGlb(rawMod, { companionFiles: binFiles, textureFiles }));
            } else {
              convertedModularFiles.push(rawMod);
            }
          } catch {
            convertedModularFiles.push(rawMod);
          }
        }

        setCompanionAnimationFiles(animFiles);
        setCompanionTextureFiles(textureFiles);
        setCompanionModularFiles(convertedModularFiles);

        if (primaryFile) {
          const lower = primaryFile.name.toLowerCase();
          if (lower.endsWith('.fbx')) {
            setProcessingStatus(`Converting FBX with ${textureFiles.length} textures...`);
            const glb = await convertFbxToGlb(primaryFile, { textureFiles });
            setSelectedFile(glb);
            setPreviewUrl(URL.createObjectURL(glb));
          } else if (lower.endsWith('.obj')) {
            setProcessingStatus(`Converting OBJ with ${textureFiles.length} textures...`);
            const glb = await convertObjToGlb(primaryFile, { mtlFile, textureFiles });
            setSelectedFile(glb);
            setPreviewUrl(URL.createObjectURL(glb));
          } else if (lower.endsWith('.dae')) {
            setProcessingStatus('Converting Collada DAE model...');
            const glb = await convertDaeToGlb(primaryFile, { textureFiles });
            setSelectedFile(glb);
            setPreviewUrl(URL.createObjectURL(glb));
          } else if (lower.endsWith('.vox')) {
            setProcessingStatus('Converting MagicaVoxel VOX model...');
            const glb = await convertVoxToGlb(primaryFile);
            setSelectedFile(glb);
            setPreviewUrl(URL.createObjectURL(glb));
          } else if (lower.endsWith('.stl')) {
            setProcessingStatus('Converting STL model...');
            const glb = await convertStlToGlb(primaryFile);
            setSelectedFile(glb);
            setPreviewUrl(URL.createObjectURL(glb));
          } else if (lower.endsWith('.ply')) {
            setProcessingStatus('Converting PLY model...');
            const glb = await convertPlyToGlb(primaryFile);
            setSelectedFile(glb);
            setPreviewUrl(URL.createObjectURL(glb));
          } else if (lower.endsWith('.gltf')) {
            setProcessingStatus(`Bundling GLTF model with binary buffers and ${textureFiles.length} textures...`);
            const glb = await convertGltfToGlb(primaryFile, { companionFiles: binFiles, textureFiles });
            setSelectedFile(glb);
            setPreviewUrl(URL.createObjectURL(glb));
          } else {
            setSelectedFile(primaryFile);
            setPreviewUrl(URL.createObjectURL(primaryFile));
          }
          showToast?.(`Processed 3D model with ${textureFiles.length} textures and ${convertedModularFiles.length} modular pieces!`);
          setIsProcessing(false);
          setProcessingStatus(null);
          return;
        }
      }

      // 3. Single 3D file dropped / picked
      const file = files[0];
      const lower = file.name.toLowerCase();

      if (lower.endsWith('.glb')) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      } else if (lower.endsWith('.gltf')) {
        setProcessingStatus('Bundling GLTF model into binary GLB...');
        const glb = await convertGltfToGlb(file);
        setSelectedFile(glb);
        setPreviewUrl(URL.createObjectURL(glb));
      } else if (lower.endsWith('.fbx')) {
        setProcessingStatus('Converting FBX model to GLB binary...');
        const glb = await convertFbxToGlb(file);
        setSelectedFile(glb);
        setPreviewUrl(URL.createObjectURL(glb));
      } else if (lower.endsWith('.obj')) {
        setProcessingStatus('Converting OBJ model to GLB binary...');
        const glb = await convertObjToGlb(file);
        setSelectedFile(glb);
        setPreviewUrl(URL.createObjectURL(glb));
      } else if (lower.endsWith('.vox')) {
        setProcessingStatus('Converting MagicaVoxel model...');
        const glb = await convertVoxToGlb(file);
        setSelectedFile(glb);
        setPreviewUrl(URL.createObjectURL(glb));
      } else if (lower.endsWith('.dae')) {
        setProcessingStatus('Converting Collada model...');
        const glb = await convertDaeToGlb(file);
        setSelectedFile(glb);
        setPreviewUrl(URL.createObjectURL(glb));
      } else if (lower.endsWith('.stl')) {
        setProcessingStatus('Converting STL model...');
        const glb = await convertStlToGlb(file);
        setSelectedFile(glb);
        setPreviewUrl(URL.createObjectURL(glb));
      } else if (lower.endsWith('.ply')) {
        setProcessingStatus('Converting PLY model...');
        const glb = await convertPlyToGlb(file);
        setSelectedFile(glb);
        setPreviewUrl(URL.createObjectURL(glb));
      } else if (/\.(png|jpe?g|webp|bmp)$/i.test(lower)) {
        // Standard 2D sprite image: show 2D preview
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setErrorMessage(`Unsupported file format: ${file.name}`);
      }
    } catch (err: any) {
      console.error('File ingestion error:', err);
      setErrorMessage(err.message || 'Failed to process asset file.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus(null);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCompanionAnimationFiles([]);
    setCompanionTextureFiles([]);
    setCompanionModularFiles([]);
    setIntentHint(undefined);
    setErrorMessage(null);
    setUploadSuccess(null);
    setUnpackedZip(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (zipInputRef.current) zipInputRef.current.value = '';
  };

  // Selection Handler
  const handleSelectAsset = (asset: GameAssetItem) => {
    soundSynth?.playSelectSound?.();
    const sourceId = asset.source || asset.id;
    const assetName = getAssetName(asset);
    if (activeAssetPicker) {
      activeAssetPicker.onSelect(sourceId, asset);
      closeAssetPicker();
      showToast?.(`Selected ${assetName} for entity!`);
    } else if (onSelectModel) {
      onSelectModel(sourceId, asset);
      showToast?.(`Selected ${assetName}!`);
    }
  };

  // Filtered Library Assets
  const filteredLibraryAssets = useMemo(() => {
    let list = libraryAssets;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          getAssetName(a).toLowerCase().includes(q) ||
          a.source.toLowerCase().includes(q) ||
          (a.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    if (libraryCategoryFilter === 'CHARACTERS') {
      list = list.filter(
        (a) =>
          (a.tags || []).some((t) => /character|hero|npc|actor/i.test(t)) ||
          (a.categories || []).some((c) => /character|npc/i.test(c))
      );
    } else if (libraryCategoryFilter === 'MODULAR') {
      list = list.filter(
        (a) =>
          (a.tags || []).some((t) => /modular|piece|armor|hair|clothes/i.test(t)) ||
          a.isModularComponent
      );
    } else if (libraryCategoryFilter === 'WEAPONS') {
      list = list.filter(
        (a) =>
          (a.tags || []).some((t) => /weapon|sword|shield|bow|axe|tool/i.test(t)) ||
          (a.categories || []).some((c) => /item|weapon/i.test(c))
      );
    } else if (libraryCategoryFilter === 'CREATURES') {
      list = list.filter(
        (a) =>
          (a.tags || []).some((t) => /creature|monster|beast|dragon/i.test(t)) ||
          (a.categories || []).some((c) => /creature|monster/i.test(c))
      );
    } else if (libraryCategoryFilter === 'PROPS') {
      list = list.filter(
        (a) =>
          (a.tags || []).some((t) => /prop|scenery|object|tree|building|voxel/i.test(t)) ||
          (a.categories || []).some((c) => /prop|scenery/i.test(c))
      );
    }
    return list;
  }, [libraryAssets, searchQuery, libraryCategoryFilter]);

  // If a 3D model is loaded, immediately show AssetDefinitionStudio!
  if (selectedFile?.name.match(/\.(fbx|glb|gltf|obj|vox|dae|stl|ply)$/i) && previewUrl) {
    return (
      <div className="h-full flex flex-col bg-[#050b14] text-slate-200 font-mono">
        <AssetDefinitionStudio
          file={selectedFile}
          previewUrl={previewUrl}
          companionAnimationFiles={companionAnimationFiles}
          companionTextureFiles={companionTextureFiles}
          companionModularFiles={companionModularFiles}
          intentHint={intentHint}
          onSuccess={(asset) => {
            if (activeAssetPicker) {
              activeAssetPicker.onSelect(asset.source || asset.id, asset);
              closeAssetPicker();
              showToast?.(`Selected ${asset.name} for entity!`);
            } else {
              setUploadSuccess(asset);
              onUploadComplete?.(asset);
            }
          }}
          onCancel={resetUpload}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#050b14] text-slate-200 font-mono select-none">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void handleFiles(Array.from(e.target.files));
        }}
      />
      <input
        ref={zipInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) void handleFiles([e.target.files[0]]);
        }}
      />

      {/* TOP UNIFIED NAVIGATION / TAB BAR */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#07111c] border-b border-amber-500/20 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              soundSynth?.playUiClick?.();
              setActiveTab('upload');
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-amber-600/30 border border-amber-500/60 text-amber-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>⚡ Upload Studio</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundSynth?.playUiClick?.();
              setActiveTab('library');
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'library'
                ? 'bg-amber-600/30 border border-amber-500/60 text-amber-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-cyan-400" />
            <span>📦 Model & Asset Library</span>
            {totalLibraryCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 bg-black/50 text-amber-400 rounded-full font-mono border border-amber-500/30">
                {totalLibraryCount}
              </span>
            )}
          </button>
        </div>

        {/* Picker Mode Indicator or Quick Actions */}
        {activeAssetPicker ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-amber-300 bg-amber-950/40 border border-amber-500/40 px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
              <span>{activeAssetPicker.title || 'Select Model for Entity'}</span>
            </span>
            <button
              type="button"
              onClick={() => closeAssetPicker()}
              className="px-2 py-1 text-[10px] text-slate-400 hover:text-white bg-slate-800/60 rounded border border-slate-700 hover:bg-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="text-[10px] text-slate-500 flex items-center gap-2">
            <span>Saints 3D Asset Pipeline</span>
            <span className="text-slate-600">·</span>
            <span className="text-[#cbb26a]">v2.2.032</span>
          </div>
        )}
      </div>

      {/* BODY CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: UPLOAD STUDIO */}
        {activeTab === 'upload' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Header Banner */}
            <div className="bg-[#0b1320]/80 border border-[#cbb26a]/30 rounded-xl p-3.5 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[#e2d5b3] font-bold text-sm">
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>3D Model & Modular Ingestion Studio</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed max-w-2xl">
                  Choose a model type below or drop files directly into the viewport. Skinned rigs, animations, PBR texture maps,
                  and modular attachments are automatically vetted, textured, and scaled.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('library')}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-black/40 border border-amber-500/30 text-amber-300 hover:border-amber-400 hover:bg-amber-950/20 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Box className="w-3.5 h-3.5" />
                <span>Browse Library</span>
                <ChevronRight className="w-3 h-3 text-slate-400" />
              </button>
            </div>

            {/* MODEL TYPE / SYSTEM INTENT BUTTONS */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>1. Select Model Type & Ingestion System</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {/* 1: Complete Character */}
                <button
                  type="button"
                  onClick={() => handleIntentClick('complete_character')}
                  className="bg-[#07111c] border border-amber-500/30 hover:border-amber-400 hover:bg-[#0c1828] p-3 rounded-xl text-left transition-all hover:scale-[1.01] cursor-pointer group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 group-hover:scale-105 transition-transform">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs text-amber-300">Complete Character</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Humanoids, heroes, NPCs, skeletons with skeletal rigs & animations.
                  </p>
                </button>

                {/* 2: Modular Base Body */}
                <button
                  type="button"
                  onClick={() => handleIntentClick('modular_base')}
                  className="bg-[#07111c] border border-emerald-500/30 hover:border-emerald-400 hover:bg-[#071f1a] p-3 rounded-xl text-left transition-all hover:scale-[1.01] cursor-pointer group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 group-hover:scale-105 transition-transform">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs text-emerald-300">Modular Base Body</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Reference base mesh meant to mount modular wardrobe & armor pieces.
                  </p>
                </button>

                {/* 3: Modular Wardrobe / Armor Piece */}
                <button
                  type="button"
                  onClick={() => handleIntentClick('modular_piece')}
                  className="bg-[#07111c] border border-cyan-500/30 hover:border-cyan-400 hover:bg-[#081e28] p-3 rounded-xl text-left transition-all hover:scale-[1.01] cursor-pointer group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 group-hover:scale-105 transition-transform">
                      <Puzzle className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs text-cyan-300">Modular Armor & Clothes</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Hair, hats/helmets, shirts, pants, boots, gloves, back accessories.
                  </p>
                </button>

                {/* 4: Weapons & Tools */}
                <button
                  type="button"
                  onClick={() => handleIntentClick('weapon')}
                  className="bg-[#07111c] border border-purple-500/30 hover:border-purple-400 hover:bg-[#1a0e28] p-3 rounded-xl text-left transition-all hover:scale-[1.01] cursor-pointer group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 group-hover:scale-105 transition-transform">
                      <Crosshair className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs text-purple-300">Weapons & Equipment</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Swords, axes, shields, bows, staves with calibrated grip sockets.
                  </p>
                </button>

                {/* 5: Creatures & Mounts */}
                <button
                  type="button"
                  onClick={() => handleIntentClick('creature_monster')}
                  className="bg-[#07111c] border border-orange-500/30 hover:border-orange-400 hover:bg-[#231208] p-3 rounded-xl text-left transition-all hover:scale-[1.01] cursor-pointer group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30 group-hover:scale-105 transition-transform">
                      <PawPrint className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs text-orange-300">Creatures & Mounts</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Turn-based capture creatures, quadruped beasts, flyers, monster bosses.
                  </p>
                </button>

                {/* 6: Props & Scenery */}
                <button
                  type="button"
                  onClick={() => handleIntentClick('prop')}
                  className="bg-[#07111c] border border-blue-500/30 hover:border-blue-400 hover:bg-[#071628] p-3 rounded-xl text-left transition-all hover:scale-[1.01] cursor-pointer group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 group-hover:scale-105 transition-transform">
                      <Cuboid className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs text-blue-300">Props & Voxel Scenery</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Chests, furniture, trees, buildings, MagicaVoxel (.vox) models.
                  </p>
                </button>

                {/* 7: Animation Clips */}
                <button
                  type="button"
                  onClick={() => handleIntentClick('animation_pack')}
                  className="bg-[#07111c] border border-rose-500/30 hover:border-rose-400 hover:bg-[#280c14] p-3 rounded-xl text-left transition-all hover:scale-[1.01] cursor-pointer group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 group-hover:scale-105 transition-transform">
                      <Film className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs text-rose-300">Animation Clips</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Companion FBX/GLB animation files to bind to existing rigs.
                  </p>
                </button>

                {/* 8: 2D Sprites & Sheets */}
                <button
                  type="button"
                  onClick={() => handleIntentClick('2d_sprite')}
                  className="bg-[#07111c] border border-slate-700 hover:border-slate-500 hover:bg-slate-900/60 p-3 rounded-xl text-left transition-all hover:scale-[1.01] cursor-pointer group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center border border-slate-700 group-hover:scale-105 transition-transform">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs text-slate-300">2D Sprites & Sheets</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Classic 2D sprites, directional sheets, tilesets, or audio.
                  </p>
                </button>
              </div>
            </div>

            {/* INTERACTIVE DRAG & DROP ZONE */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <FileUp className="w-3 h-3 text-cyan-400" />
                <span>2. Drag & Drop 3D Models, Textures, or Archives</span>
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const files = Array.from(e.dataTransfer.files || []);
                  if (files.length > 0) void handleFiles(files);
                }}
                className="border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-[#07111c]/70 hover:bg-[#0c1828]/90 rounded-xl p-8 text-center transition-all group"
              >
                <div className="max-w-xl mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 animate-pulse" />
                  </div>

                  <div>
                    <div className="text-white font-bold text-sm">
                      Click or drag & drop 3D models (FBX, GLB, OBJ, VOX, DAE, STL, PLY) or ZIP packages here
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Multi-file drops supported: drop OBJ+MTL, FBX+Textures (PNG/JPG/TGA/DDS), or animation clips together.
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundSynth?.playUiClick?.();
                        if (fileInputRef.current) {
                          fileInputRef.current.accept = '.fbx,.glb,.gltf,.obj,.vox,.dae,.stl,.ply,.zip,.png,.jpg,.jpeg,.webp,.tga,.dds,.bmp,.mtl';
                          fileInputRef.current.click();
                        }
                      }}
                      className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all shadow-md shadow-amber-950/40 flex items-center gap-2 cursor-pointer"
                    >
                      <Cuboid className="w-4 h-4" />
                      <span>Browse 3D Model / Multi-Files...</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundSynth?.playUiClick?.();
                        if (zipInputRef.current) zipInputRef.current.click();
                      }}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Package className="w-4 h-4 text-emerald-400" />
                      <span>Browse ZIP Archive...</span>
                    </button>
                  </div>

                  {/* Format Pills */}
                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-center gap-1.5 flex-wrap text-[9px] font-mono text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-black/40 border border-slate-800 text-amber-300">FBX (Skinned & Rigs)</span>
                    <span className="px-2 py-0.5 rounded bg-black/40 border border-slate-800 text-cyan-300">GLB / GLTF</span>
                    <span className="px-2 py-0.5 rounded bg-black/40 border border-slate-800 text-emerald-300">OBJ + MTL</span>
                    <span className="px-2 py-0.5 rounded bg-black/40 border border-slate-800 text-purple-300">VOX (MagicaVoxel)</span>
                    <span className="px-2 py-0.5 rounded bg-black/40 border border-slate-800 text-orange-300">Collada DAE</span>
                    <span className="px-2 py-0.5 rounded bg-black/40 border border-slate-800 text-blue-300">STL / PLY</span>
                    <span className="px-2 py-0.5 rounded bg-black/40 border border-slate-800 text-rose-300">ZIP Packages</span>
                    <span className="px-2 py-0.5 rounded bg-black/40 border border-slate-800 text-slate-300">PBR Textures (PNG/JPG/TGA/DDS)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PROCESSING SPINNER */}
            {isProcessing && (
              <div className="bg-[#0b1320] border border-amber-500/40 rounded-xl p-4 flex items-center gap-3 animate-pulse">
                <Loader2 className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
                <div className="text-xs text-amber-300 font-bold">
                  {processingStatus || 'Processing asset files...'}
                </div>
              </div>
            )}

            {/* ERROR BANNER */}
            {errorMessage && (
              <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-3 flex items-center justify-between text-rose-300 text-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-rose-400 hover:text-white px-2 py-0.5 rounded"
                >
                  ✕
                </button>
              </div>
            )}

            {/* 2D UNPACKED MODULAR ZIP PREVIEW */}
            {unpackedZip && (
              <div className="bg-black/50 border border-emerald-500/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                    <Package className="w-4 h-4 text-emerald-400" />
                    <span>Unpacked 2D Modular Package: {unpackedZip.presetName} ({unpackedZip.layers.length} layers)</span>
                  </div>
                  {onOpenSlicer && (
                    <button
                      type="button"
                      onClick={() => onOpenSlicer({ id: 'unpacked', filename: unpackedZip.presetName || 'modular_package', storagePath: '' })}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold text-xs flex items-center gap-1.5"
                    >
                      <Scissors className="w-3.5 h-3.5" />
                      <span>Open in Spritesheet Slicer</span>
                    </button>
                  )}
                </div>

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
              </div>
            )}

            {/* SUCCESS BANNER */}
            {uploadSuccess && (
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <div className="text-emerald-200 font-bold text-sm">Asset Successfully Ingested!</div>
                <div className="text-xs text-slate-300">
                  Registered as <span className="text-amber-300 font-bold">{uploadSuccess.usableAsset?.name || uploadSuccess.name}</span> in the game library.
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={resetUpload}
                    className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-xs transition cursor-pointer"
                  >
                    Upload Another Asset
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetUpload();
                      setActiveTab('library');
                    }}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-xs transition cursor-pointer shadow"
                  >
                    View in Asset Library
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ASSET LIBRARY & MODEL SELECTOR */}
        {activeTab === 'library' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Search & Filter Toolbar */}
            <div className="bg-[#07111c] border border-amber-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search 3D models and assets by name, tag, or path..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#050b14] border border-amber-500/30 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1 flex-wrap">
                {(
                  [
                    { id: 'ALL', label: 'All Models' },
                    { id: 'CHARACTERS', label: 'Characters' },
                    { id: 'MODULAR', label: 'Modular' },
                    { id: 'WEAPONS', label: 'Weapons' },
                    { id: 'CREATURES', label: 'Creatures' },
                    { id: 'PROPS', label: 'Props' },
                    { id: '2D', label: '2D Sprites' },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      soundSynth?.playUiClick?.();
                      setLibraryCategoryFilter(cat.id);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                      libraryCategoryFilter === cat.id
                        ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                        : 'bg-black/30 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void fetchLibrary()}
                  title="Refresh library"
                  className="p-1.5 bg-[#050b14] hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLibrary ? 'animate-spin text-amber-400' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundSynth?.playUiClick?.();
                    setActiveTab('upload');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/25 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload New Asset</span>
                </button>
              </div>
            </div>

            {/* Model Catalog Grid */}
            {isLoadingLibrary ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-xs gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                <span>Loading 3D model catalog...</span>
              </div>
            ) : filteredLibraryAssets.length === 0 ? (
              <div className="bg-[#07111c]/60 border border-slate-800 rounded-xl p-12 text-center space-y-3">
                <Cuboid className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-white font-bold text-sm">No 3D Models Found</div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {searchQuery
                    ? `No assets matched "${searchQuery}". Try adjusting your search query or filters.`
                    : 'No models found in this category. Upload your first 3D model using the Upload Studio!'}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-xs transition cursor-pointer shadow"
                >
                  + Upload 3D Model Now
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2 font-mono">
                  <span>Showing <strong className="text-amber-400">{filteredLibraryAssets.length}</strong> assets</span>
                  <span>Click "Select Model" to assign directly to entity</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredLibraryAssets.map((asset) => {
                    const is3D = asset.type === 'MODEL' || asset.source?.endsWith('.glb') || asset.source?.endsWith('.fbx');
                    const rigFamily = asset.metadata?.rigAnalysis?.family || asset.metadata?.rigFamily;
                    const structure = asset.metadata?.structure || (asset.isModularComponent ? 'Modular' : 'Complete');

                    return (
                      <div
                        key={asset.id}
                        className="bg-[#07111c] border border-slate-800 hover:border-amber-500/50 rounded-xl p-3 flex flex-col justify-between transition-all group hover:bg-[#0c1828]"
                      >
                        <div>
                          {/* Card Header & Visual Thumbnail */}
                          <div className="flex items-start gap-3 mb-2">
                            <div className="w-12 h-12 rounded-lg bg-black/50 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden group-hover:border-amber-500/50 transition-colors">
                              {is3D ? (
                                <Cuboid className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
                              ) : (
                                <ImageIcon className="w-6 h-6 text-amber-400" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-xs text-white truncate group-hover:text-amber-300 transition-colors">
                                {getAssetName(asset)}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                                {asset.source?.split('/').pop() || asset.id}
                              </div>

                              {/* Badges */}
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
                                  {is3D ? '3D MODEL' : '2D SPRITE'}
                                </span>
                                {structure && (
                                  <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-amber-950/60 text-amber-300 border border-amber-800/60">
                                    {structure}
                                  </span>
                                )}
                                {rigFamily && (
                                  <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-purple-950/60 text-purple-300 border border-purple-800/60">
                                    {rigFamily.replace('_', ' ')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card Action Buttons */}
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(asset.source || asset.id);
                              showToast?.('Copied model asset path to clipboard!');
                            }}
                            title="Copy asset path"
                            className="p-1 text-slate-500 hover:text-slate-300 rounded hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Primary Select Action */}
                          {(activeAssetPicker || onSelectModel) ? (
                            <button
                              type="button"
                              onClick={() => handleSelectAsset(asset)}
                              className="flex-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-950/40"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Select Model</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectAsset(asset);
                              }}
                              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold transition cursor-pointer"
                            >
                              Use Asset
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
