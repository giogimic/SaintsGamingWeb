import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { soundSynth } from '@/engine/sound-synth';
import {
  Layers,
  Plus,
  Grid,
  Trash2,
  Search,
  ImageIcon,
  X,
  Check,
  Info,
  Settings,
  PaintBucket,
  Download,
  Copy,
  Sparkles,
  Brush,
  Eraser,
  Shield,
  BookOpen,
  Tag,
  Save,
  ZoomIn,
  ZoomOut,
  Scissors,
  Crosshair,
  Target,
  Package,
  Box,
  Sliders,
  Move,
  Maximize2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { AssetManager, type GameAssetItem } from '@/engine/assets/AssetManager';
import { savePrefab, listPrefabs, type PrefabTileData } from '@/app/actions/prefabs';
import { STUDIO_TRIGGER_SAVE_MAP_EVENT } from '@/shared/game/studioEvents';
import { TILESET_SIZES } from '../data/tileset-sizes';
import { useGameStore } from '../store';
import { useEditorStore } from './editor-store';

export interface TilesetMeta {
  firstgid: number;
  imageSource: string;
  columns: number;
  tilewidth: number;
  tileheight: number;
  imagewidth?: number;
  imageheight?: number;
  offsetX?: number;
  offsetY?: number;
  margin?: number;
  spacing?: number;
}

export interface TileDefinition {
  id: string;
  name: string;
  sourceSheet: string;
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  gid: number;
  tags: string[];
  collision: 'NONE' | 'SOLID' | 'WATER' | 'LEDGE' | 'CLIFF';
  gameplayFlags: string[];
  material: string;
  thumbnailUrl?: string;
}

export interface TileVisualThumbnailProps {
  sourceSheet: string;
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  zoom?: number;
  size?: number;
  className?: string;
}

export const TileVisualThumbnail: React.FC<TileVisualThumbnailProps> = ({
  sourceSheet,
  sourceX,
  sourceY,
  sourceWidth,
  sourceHeight,
  zoom,
  size = 48,
  className = '',
}) => {
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [imgErr, setImgErr] = useState(false);

  const imgUrl =
    sourceSheet.startsWith('/') || sourceSheet.startsWith('http')
      ? sourceSheet
      : `/game-assets/tilesets/${sourceSheet}`;

  useEffect(() => {
    let active = true;
    const img = new Image();
    img.onload = () => {
      if (active) {
        setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
        setImgErr(false);
      }
    };
    img.onerror = () => {
      if (active) setImgErr(true);
    };
    img.src = imgUrl;
    return () => {
      active = false;
    };
  }, [imgUrl]);

  const tileW = Math.max(1, sourceWidth || 16);
  const tileH = Math.max(1, sourceHeight || 16);
  const calcZoom =
    zoom ?? Math.max(1, Math.min(4, Math.floor((size - 4) / Math.max(tileW, tileH))));

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-lg bg-[#050b14] border border-slate-800 shrink-0 select-none ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundImage: `
          linear-gradient(45deg, #111827 25%, transparent 25%),
          linear-gradient(-45deg, #111827 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #111827 75%),
          linear-gradient(-45deg, transparent 75%, #111827 75%)
        `,
        backgroundSize: '8px 8px',
        backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
      }}
    >
      {!imgErr && imgSize ? (
        <div
          style={{
            width: `${tileW}px`,
            height: `${tileH}px`,
            backgroundImage: `url('${imgUrl}')`,
            backgroundPosition: `-${sourceX}px -${sourceY}px`,
            backgroundSize: `${imgSize.w}px ${imgSize.h}px`,
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated',
            transform: `scale(${calcZoom})`,
            transformOrigin: 'center center',
          }}
        />
      ) : (
        <Grid className="w-4 h-4 text-amber-500/40" />
      )}
    </div>
  );
};

export function getStarterTilePresets(activeTs?: TilesetMeta | null): TileDefinition[] {
  const sheet = activeTs?.imageSource || 'Terrain_by_George.png';
  const tw = activeTs?.tilewidth || 16;
  const th = activeTs?.tileheight || 16;
  const fg = activeTs?.firstgid || 1;
  const cols = activeTs?.columns || 8;

  return [
    {
      id: 'preset-grass-01',
      name: 'Lush Grass',
      sourceSheet: sheet,
      sourceX: 0,
      sourceY: 0,
      sourceWidth: tw,
      sourceHeight: th,
      gid: fg,
      tags: ['terrain', 'grass', 'ground'],
      collision: 'NONE',
      gameplayFlags: ['walkable'],
      material: 'GRASS',
    },
    {
      id: 'preset-grass-02',
      name: 'Wild Turf Grass',
      sourceSheet: sheet,
      sourceX: tw,
      sourceY: 0,
      sourceWidth: tw,
      sourceHeight: th,
      gid: fg + 1,
      tags: ['terrain', 'grass'],
      collision: 'NONE',
      gameplayFlags: ['walkable'],
      material: 'GRASS',
    },
    {
      id: 'preset-dirt-path',
      name: 'Dirt Path',
      sourceSheet: sheet,
      sourceX: tw * 2,
      sourceY: 0,
      sourceWidth: tw,
      sourceHeight: th,
      gid: fg + 2,
      tags: ['terrain', 'path', 'dirt'],
      collision: 'NONE',
      gameplayFlags: ['walkable'],
      material: 'DIRT',
    },
    {
      id: 'preset-stone-cobble',
      name: 'Cobblestone Road',
      sourceSheet: sheet,
      sourceX: tw * 3,
      sourceY: 0,
      sourceWidth: tw,
      sourceHeight: th,
      gid: fg + 3,
      tags: ['structures', 'path', 'stone'],
      collision: 'NONE',
      gameplayFlags: ['walkable'],
      material: 'STONE',
    },
    {
      id: 'preset-solid-wall',
      name: 'Stone Fortress Wall',
      sourceSheet: sheet,
      sourceX: 0,
      sourceY: th,
      sourceWidth: tw,
      sourceHeight: th,
      gid: fg + cols,
      tags: ['structures', 'wall', 'solid'],
      collision: 'SOLID',
      gameplayFlags: ['blocking'],
      material: 'STONE',
    },
    {
      id: 'preset-wood-wall',
      name: 'Wood Cabin Wall',
      sourceSheet: sheet,
      sourceX: tw,
      sourceY: th,
      sourceWidth: tw,
      sourceHeight: th,
      gid: fg + cols + 1,
      tags: ['structures', 'wall', 'wood'],
      collision: 'SOLID',
      gameplayFlags: ['blocking'],
      material: 'WOOD',
    },
    {
      id: 'preset-water-pond',
      name: 'Clear Water Pool',
      sourceSheet: sheet,
      sourceX: tw * 2,
      sourceY: th,
      sourceWidth: tw,
      sourceHeight: th,
      gid: fg + cols + 2,
      tags: ['nature', 'water'],
      collision: 'WATER',
      gameplayFlags: ['swimmable'],
      material: 'WATER',
    },
    {
      id: 'preset-ledge-cliff',
      name: 'Rocky Ledge',
      sourceSheet: sheet,
      sourceX: tw * 3,
      sourceY: th,
      sourceWidth: tw,
      sourceHeight: th,
      gid: fg + cols + 3,
      tags: ['nature', 'cliff', 'ledge'],
      collision: 'LEDGE',
      gameplayFlags: ['jump_down'],
      material: 'STONE',
    },
  ];
}

export function suggestGridForImage(w: number, h: number): { size: number; reason: string } {
  if (w > 0 && h > 0) {
    if (w % 32 === 0 && h % 32 === 0 && w >= 256) {
      return { size: 32, reason: 'Detected standard 32×32px pixel grid' };
    }
    if (w % 48 === 0 && h % 48 === 0) {
      return { size: 48, reason: 'Detected 48×48px RPG tilesheet' };
    }
    if (w % 24 === 0 && h % 24 === 0) {
      return { size: 24, reason: 'Detected 24×24px retro grid' };
    }
    if (w % 64 === 0 && h % 64 === 0 && w >= 512) {
      return { size: 64, reason: 'Detected 64×64px HD tile blocks' };
    }
    if (w % 16 === 0 && h % 16 === 0) {
      return { size: 16, reason: 'Detected 16×16px classic pixel grid' };
    }
  }
  return { size: 32, reason: 'Standard 32×32px grid suggested' };
}

export interface TilesetPickerProps {
  tilesets: TilesetMeta[];
  activeBrushTileId: number;
  onBrushSelect: (gid: number) => void;
  onBrushSelectPattern?: (pattern: { w: number; h: number; gids: number[][] } | null) => void;
  activeLayerIdx: number;
  onLayerChange: (idx: number) => void;
  tileLayers: Array<{ name: string; grid: number[][] }>;
  onAddLayer: () => void;
  onDeleteLayer?: (idx: number) => void;
  onClearLayer?: (idx: number) => void;
  onFillLayer?: (idx: number, gid: number) => void;
  onSetDefaultGroundGid?: (gid: number) => void;
  onUpdateTilesets?: (tilesets: TilesetMeta[]) => void;
}

export default function TilesetPicker({
  tilesets,
  activeBrushTileId,
  onBrushSelect,
  onBrushSelectPattern,
  activeLayerIdx,
  onLayerChange,
  tileLayers,
  onAddLayer,
  onDeleteLayer,
  onClearLayer,
  onFillLayer,
  onSetDefaultGroundGid,
  onUpdateTilesets,
}: TilesetPickerProps) {
  const showToast = useGameStore((s) => s.showToast);
  const activeBrushPattern = useEditorStore((s) => s.activeBrushPattern);
  const stampScale = useEditorStore((s) => s.stampScale);
  const setStampScale = useEditorStore((s) => s.setStampScale);
  const [activeTab, setActiveTab] = useState<'palette' | 'library'>('palette');
  const [activeTsIdx, setActiveTsIdx] = useState(0);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [imgError, setImgError] = useState(false);
  const [showGridOverlay, setShowGridOverlay] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectionMode, setSelectionMode] = useState<'grid' | 'slicer'>('grid');
  const [isCalibratingOrigin, setIsCalibratingOrigin] = useState<boolean>(false);
  const [slicerSelection, setSlicerSelection] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const slicerSelectionRef = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const slicerDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);
  const [extractTileWidth, setExtractTileWidth] = useState<number>(32);
  const [extractTileHeight, setExtractTileHeight] = useState<number>(32);
  const [extractOffsetX, setExtractOffsetX] = useState<number>(0);
  const [extractOffsetY, setExtractOffsetY] = useState<number>(0);
  const [extractSpacing, setExtractSpacing] = useState<number>(0);
  const [extractZoom, setExtractZoom] = useState<number>(1);
  const [extractOriginPicking, setExtractOriginPicking] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ r: number; c: number } | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{ leftPct: number; topPct: number; widthPct: number; heightPct: number; gid: number; col: number; row: number; w: number; h: number } | null>(null);
  const [tilesetSearch, setTilesetSearch] = useState('');
  const setPrefabs = useEditorStore((s) => s.setPrefabs);
  const setActivePrefabId = useEditorStore((s) => s.setActivePrefabId);
  const openPanel = useEditorStore((s) => s.openPanel);
  const setBrushMode = useEditorStore((s) => s.setBrushMode);
  const [tileContextMenu, setTileContextMenu] = useState<{
    x: number;
    y: number;
    gid: number;
    row: number;
    col: number;
    w: number;
    h: number;
    localId: number;
    ts: TilesetMeta;
    dataUrl?: string;
  } | null>(null);

  // Tile Library state (backed by global useEditorStore so extracted tiles persist)
  const tileDefinitions = useEditorStore((s) => s.tileDefinitions);
  const selectedTileDefId = useEditorStore((s) => s.selectedTileDefId);
  const setTileDefinitions = useEditorStore((s) => s.setTileDefinitions);
  const addTileDefinitions = useEditorStore((s) => s.addTileDefinitions);
  const removeTileDefinition = useEditorStore((s) => s.removeTileDefinition);
  const setSelectedTileDefId = useEditorStore((s) => s.setSelectedTileDefId);

  const handleDeleteTileDefinition = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    soundSynth?.playUiClick?.();
    removeTileDefinition(id);
    showToast('Removed tile from library.');
  };

  const handleLoadStarterPresets = () => {
    soundSynth?.playActionSound?.();
    const presets = getStarterTilePresets(ts);
    addTileDefinitions(presets);
    if (presets[0]) {
      handleSelectTileDefinition(presets[0]);
    }
    showToast(`Loaded ${presets.length} Starter Tile Presets!`);
  };

  const [libraryFilter, setLibraryFilter] = useState('');
  const [libraryTagFilter, setLibraryTagFilter] = useState('ALL');
  const [isSaveDefModalOpen, setIsSaveDefModalOpen] = useState(false);
  const [pendingDef, setPendingDef] = useState<Partial<TileDefinition> | null>(null);
  
  // Asset Manager Add Tileset Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [availableTilesetAssets, setAvailableTilesetAssets] = useState<GameAssetItem[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [assetSearchQuery, setAssetSearchQuery] = useState('');

  const ts = tilesets && tilesets.length > 0 ? tilesets[Math.min(activeTsIdx, tilesets.length - 1)] : null;
  const imgRef = useRef<HTMLImageElement>(null);
  const isPointerDownRef = useRef<boolean>(false);
  const isInternalSelectionRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ r: number; c: number } | null>(null);
  const dragBoundsRef = useRef<{ row: number; col: number; w: number; h: number } | null>(null);
  const lastSoundPlayRef = useRef<number>(0);

  const tsRef = useRef<TilesetMeta | null>(ts);
  tsRef.current = ts;
  const naturalRef = useRef<{ w: number; h: number }>(natural);
  naturalRef.current = natural;
  const selectionModeRef = useRef<'grid' | 'slicer'>(selectionMode);
  selectionModeRef.current = selectionMode;

  // Selected tile definition object
  const selectedDef = useMemo(() => {
    if (!tileDefinitions.length) return null;
    if (selectedTileDefId) {
      const match = tileDefinitions.find((d) => d.id === selectedTileDefId);
      if (match) return match;
    }
    return tileDefinitions[0] || null;
  }, [tileDefinitions, selectedTileDefId]);

  // Load tile definitions on mount (seed default starter presets only if store is currently empty)
  const hasInitializedLibraryRef = useRef(false);
  const loadTileLibrary = useCallback(async () => {
    if (hasInitializedLibraryRef.current) return;
    hasInitializedLibraryRef.current = true;

    try {
      const manager = AssetManager.getInstance();
      const res = await manager.searchAssets({ type: 'TILE' }, 0, 100);
      if (res?.items && res.items.length > 0) {
        const defs: TileDefinition[] = res.items.map((item) => {
          let region = { x: 0, y: 0, w: 16, h: 16 };
          if (item.metadata?.sourceRegion) {
            region =
              typeof item.metadata.sourceRegion === 'string'
                ? JSON.parse(item.metadata.sourceRegion)
                : item.metadata.sourceRegion;
          }
          return {
            id: item.id,
            name: item.metadata?.originalName || item.id,
            sourceSheet: item.source || item.metadata?.sourceSheet || '',
            sourceX: region.x || 0,
            sourceY: region.y || 0,
            sourceWidth: region.w || item.metadata?.width || 16,
            sourceHeight: region.h || item.metadata?.height || 16,
            gid: Number(item.metadata?.gid) || 1,
            tags: item.tags || [],
            collision: item.metadata?.collision || 'NONE',
            gameplayFlags: item.metadata?.gameplayFlags || [],
            material: item.metadata?.material || 'GRASS',
            thumbnailUrl: item.cdnUrl || item.source,
          };
        });
        addTileDefinitions(defs);
        if (!useEditorStore.getState().selectedTileDefId && defs.length > 0) {
          setSelectedTileDefId(defs[0].id);
        }
      } else if (useEditorStore.getState().tileDefinitions.length === 0) {
        // Seed default starter presets only if store is completely empty
        const starter = getStarterTilePresets(tsRef.current);
        addTileDefinitions(starter);
        if (starter.length > 0) {
          setSelectedTileDefId(starter[0].id);
        }
      }
    } catch {
      if (useEditorStore.getState().tileDefinitions.length === 0) {
        const starter = getStarterTilePresets(tsRef.current);
        addTileDefinitions(starter);
        if (starter.length > 0) {
          setSelectedTileDefId(starter[0].id);
        }
      }
    }
  }, [addTileDefinitions, setSelectedTileDefId]);

  useEffect(() => {
    void loadTileLibrary();
  }, [loadTileLibrary]);

  // Auto-select tileset tab if activeBrushTileId changes from an external source (e.g. Eyedropper on the canvas)
  useEffect(() => {
    if (isInternalSelectionRef.current) {
      isInternalSelectionRef.current = false;
      return;
    }
    if (isPointerDownRef.current) return;
    if (!tilesets || tilesets.length === 0 || activeBrushTileId <= 0) return;

    // Check if activeBrushTileId already falls within the currently active tileset's range
    const currentTs = tilesets[activeTsIdx];
    if (currentTs) {
      const curCols = currentTs.columns || 1;
      const curMaxRows = Math.max(1, Math.floor(((currentTs.imageheight || natural.h || 4000) - (currentTs.offsetY || 0)) / (currentTs.tileheight || 16)));
      const curMaxTiles = curCols * curMaxRows;
      if (activeBrushTileId >= currentTs.firstgid && activeBrushTileId < currentTs.firstgid + curMaxTiles) {
        return;
      }
    }

    for (let i = tilesets.length - 1; i >= 0; i--) {
      if (activeBrushTileId >= tilesets[i].firstgid) {
        if (activeTsIdx !== i) {
          setActiveTsIdx(i);
          const cached = tilesets[i]?.imageSource ? TILESET_SIZES[tilesets[i].imageSource] : null;
          setNatural(cached || { w: imgRef.current?.naturalWidth || tilesets[i]?.imagewidth || 0, h: imgRef.current?.naturalHeight || tilesets[i]?.imageheight || 0 });
          setHoveredTile(null);
          setImgError(false);
        }
        break;
      }
    }
  }, [activeBrushTileId, tilesets, activeTsIdx, natural.h]);

  // Sync natural dimensions from image ref if image is already cached/complete
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setNatural({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight });
      setImgError(false);
    }
  }, [activeTsIdx, ts?.imageSource]);

  // Listen for studio_add_tileset event
  useEffect(() => {
    const handleAddEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ source: string; filename?: string }>;
      if (customEvent.detail?.source) {
        handleAddTilesetFromSource(customEvent.detail.source);
      }
    };
    window.addEventListener('studio_add_tileset', handleAddEvent);
    return () => window.removeEventListener('studio_add_tileset', handleAddEvent);
  }, [tilesets, onUpdateTilesets]);

  const fetchAvailableTilesetAssets = async () => {
    setLoadingAssets(true);
    try {
      const manager = AssetManager.getInstance();
      const res = await manager.searchAssets({
        type: 'TILESET',
        query: assetSearchQuery || undefined,
        sortBy: 'source',
        sortOrder: 'asc',
      });
      setAvailableTilesetAssets(res.items);
    } catch (err) {
      console.error('Failed to query tileset assets:', err);
    } finally {
      setLoadingAssets(false);
    }
  };

  useEffect(() => {
    if (isAddModalOpen) {
      void fetchAvailableTilesetAssets();
    }
  }, [isAddModalOpen, assetSearchQuery]);

  const handleAddTilesetFromSource = (rawSource: string) => {
    let normalized = rawSource;
    if (!rawSource.startsWith('/uploads/') && !rawSource.startsWith('http')) {
      normalized = rawSource.replace(/^\/game-assets\/tilesets\//i, '').replace(/^tilesets\//i, '');
      if (normalized.startsWith('/')) normalized = normalized.substring(1);
    }

    const existingIdx = tilesets.findIndex((t) => t.imageSource.toLowerCase().includes(normalized.toLowerCase()));
    if (existingIdx !== -1) {
      setActiveTsIdx(existingIdx);
      setIsAddModalOpen(false);
      return;
    }

    const nextFirstGid = tilesets.length * 100000 + 1;

    const imgUrl = normalized.startsWith('/') || normalized.startsWith('http') 
        ? normalized 
        : `/game-assets/tilesets/${normalized}`;

    const img = new Image();
    img.onload = () => {
      const suggestion = suggestGridForImage(img.width, img.height);
      const tilewidth = suggestion.size;
      const tileheight = suggestion.size;
      const columns = Math.max(1, Math.floor(img.width / tilewidth));

      TILESET_SIZES[normalized] = { w: img.width, h: img.height };
      const base = normalized.split('/').pop() || '';
      TILESET_SIZES[base] = { w: img.width, h: img.height };

      const newTileset: TilesetMeta = {
        firstgid: nextFirstGid,
        imageSource: normalized,
        columns,
        tilewidth,
        tileheight,
        imagewidth: img.width,
        imageheight: img.height,
        offsetX: 0,
        offsetY: 0,
        spacing: 0,
      };

      const updated = [...tilesets, newTileset];
      onUpdateTilesets?.(updated);
      setActiveTsIdx(updated.length - 1);
      setNatural({ w: img.width, h: img.height });
      setImgError(false);
      setIsAddModalOpen(false);
      openExtractModal(newTileset);
    };
    img.onerror = () => {
      const newTileset: TilesetMeta = {
        firstgid: nextFirstGid,
        imageSource: normalized,
        columns: 8,
        tilewidth: 16,
        tileheight: 16,
      };

      const updated = [...tilesets, newTileset];
      onUpdateTilesets?.(updated);
      setActiveTsIdx(updated.length - 1);
      setNatural({ w: 0, h: 0 });
      setImgError(false);
      setIsAddModalOpen(false);
    };
    img.src = imgUrl;
    soundSynth?.playActionSound?.();
  };

  const handleUpdateTilesetSettings = useCallback((meta: Partial<TilesetMeta>) => {
    if (!tilesets || activeTsIdx < 0 || activeTsIdx >= tilesets.length) return;
    const updated = [...tilesets];
    const current = updated[activeTsIdx];
    const newWidth = meta.tilewidth ?? current.tilewidth;
    const newHeight = meta.tileheight ?? current.tileheight;
    const newOffsetX = meta.offsetX !== undefined ? meta.offsetX : (current.offsetX ?? current.margin ?? 0);
    const newOffsetY = meta.offsetY !== undefined ? meta.offsetY : (current.offsetY ?? current.margin ?? 0);
    const newSpacing = meta.spacing !== undefined ? meta.spacing : (current.spacing ?? 0);
    const imgW = natural.w || current.imagewidth || 512;
    const imgH = natural.h || current.imageheight || 512;
    const newCols = meta.columns ?? Math.max(1, Math.floor((imgW - newOffsetX) / (newWidth + newSpacing)));

    if (current.imageSource) {
      TILESET_SIZES[current.imageSource] = { w: imgW, h: imgH };
      const base = current.imageSource.split('/').pop() || '';
      TILESET_SIZES[base] = { w: imgW, h: imgH };
    }

    updated[activeTsIdx] = {
      ...current,
      ...meta,
      tilewidth: newWidth,
      tileheight: newHeight,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
      spacing: newSpacing,
      columns: newCols,
      imagewidth: imgW,
      imageheight: imgH,
    };
    onUpdateTilesets?.(updated);
  }, [tilesets, activeTsIdx, natural.w, natural.h, onUpdateTilesets]);

  const handleRemoveTileset = (idx: number) => {
    if (!tilesets[idx]) return;
    const name = tilesets[idx].imageSource;
    if (confirm(`Remove tileset "${name}" from this map? Tiles painted with this tileset will need to be repainted.`)) {
      soundSynth?.playActionSound?.();
      const updated = tilesets.filter((_, i) => i !== idx);
      onUpdateTilesets?.(updated);
      setActiveTsIdx(Math.max(0, idx - 1));
      setNatural({ w: 0, h: 0 });
      setImgError(false);
    }
  };

  const filteredTilesets = useMemo(() => {
    if (!tilesetSearch.trim()) return tilesets.map((t, idx) => ({ t, originalIdx: idx }));
    const q = tilesetSearch.toLowerCase();
    return tilesets
      .map((t, idx) => ({ t, originalIdx: idx }))
      .filter(({ t }) => t.imageSource.toLowerCase().includes(q));
  }, [tilesets, tilesetSearch]);

  const selection = useMemo(() => {
    if (!ts || imgError) return null;
    const natW = natural.w || imgRef.current?.naturalWidth || ts.imagewidth || 512;
    const natH = natural.h || imgRef.current?.naturalHeight || ts.imageheight || 512;
    if (!natW || !natH) return null;
    const offX = ts.offsetX ?? ts.margin ?? 0;
    const offY = ts.offsetY ?? ts.margin ?? 0;
    const spacing = ts.spacing ?? 0;
    const local = activeBrushTileId - ts.firstgid;
    if (local < 0) return null;
    const maxLocal = Math.floor((natH - offY) / (ts.tileheight + spacing)) * ts.columns;
    if (local >= maxLocal) return null;
    const col = local % ts.columns;
    const row = Math.floor(local / ts.columns);

    const spanW = activeBrushPattern?.w || 1;
    const spanH = activeBrushPattern?.h || 1;

    const leftPx = offX + col * (ts.tilewidth + spacing);
    const topPx = offY + row * (ts.tileheight + spacing);
    const widthPx = spanW * ts.tilewidth + (spanW - 1) * spacing;
    const heightPx = spanH * ts.tileheight + (spanH - 1) * spacing;

    return {
      leftPct: (leftPx / natW) * 100,
      topPct: (topPx / natH) * 100,
      widthPct: (widthPx / natW) * 100,
      heightPct: (heightPx / natH) * 100,
      local,
      col,
      row,
      w: spanW,
      h: spanH,
    };
  }, [ts, activeBrushTileId, activeBrushPattern, natural, imgError]);

  const onBrushSelectRef = useRef(onBrushSelect);
  onBrushSelectRef.current = onBrushSelect;
  const onBrushSelectPatternRef = useRef(onBrushSelectPattern);
  onBrushSelectPatternRef.current = onBrushSelectPattern;

  const selectTileRegion = useCallback(
    (startRow: number, startCol: number, width: number, height: number) => {
      const currentTs = tsRef.current;
      const nw = naturalRef.current.w || imgRef.current?.naturalWidth || currentTs?.imagewidth || 512;
      const nh = naturalRef.current.h || imgRef.current?.naturalHeight || currentTs?.imageheight || 512;
      if (!currentTs || !nw || !nh) return;
      const offY = currentTs.offsetY ?? currentTs.margin ?? 0;
      const spacing = currentTs.spacing ?? 0;
      const maxRows = Math.max(1, Math.floor((nh - offY) / (currentTs.tileheight + spacing)));
      const safeRow = Math.max(0, Math.min(startRow, maxRows - 1));
      const safeCol = Math.max(0, Math.min(startCol, currentTs.columns - 1));
      const endRow = Math.min(safeRow + height - 1, maxRows - 1);
      const endCol = Math.min(safeCol + width - 1, currentTs.columns - 1);
      const spanW = endCol - safeCol + 1;
      const spanH = endRow - safeRow + 1;

      const gids: number[][] = [];
      for (let r = safeRow; r <= endRow; r++) {
        const rowGids: number[] = [];
        for (let c = safeCol; c <= endCol; c++) {
          rowGids.push(currentTs.firstgid + r * currentTs.columns + c);
        }
        gids.push(rowGids);
      }

      const topGid = gids[0]?.[0] ?? (currentTs.firstgid + safeRow * currentTs.columns + safeCol);
      const now = Date.now();
      if (now - lastSoundPlayRef.current > 150) {
        lastSoundPlayRef.current = now;
        soundSynth?.playSelectSound?.();
      }

      isInternalSelectionRef.current = true;
      onBrushSelectRef.current(topGid);
      if (spanW > 1 || spanH > 1) {
        onBrushSelectPatternRef.current?.({ w: spanW, h: spanH, gids });
        useEditorStore.getState().setPrefabStampMode('footprint');
      } else {
        onBrushSelectPatternRef.current?.(null);
        useEditorStore.getState().setPrefabStampMode('1tile');
      }
    },
    []
  );

  // Set Brush Scale changing handler
  const handleSetBrushScale = (scaleW: number, scaleH: number = scaleW) => {
    if (!ts) return;
    const nw = natural.w || imgRef.current?.naturalWidth || ts.imagewidth || 512;
    const nh = natural.h || imgRef.current?.naturalHeight || ts.imageheight || 512;
    if (!nw || !nh) return;
    const local = activeBrushTileId - ts.firstgid;
    const row = local >= 0 ? Math.floor(local / ts.columns) : 0;
    const col = local >= 0 ? local % ts.columns : 0;
    selectTileRegion(row, col, scaleW, scaleH);
    soundSynth?.playSelectSound?.();
    showToast(`Brush scale set to ${scaleW}×${scaleH} (${scaleW * ts.tilewidth}×${scaleH * ts.tileheight}px)`);
  };

  const commitSlicerSelectionToStamp = useCallback(() => {
    const currentTs = tsRef.current;
    const activeSlicer = slicerSelectionRef.current || slicerSelection;
    if (!currentTs || !activeSlicer) return;
    const nw = naturalRef.current.w || imgRef.current?.naturalWidth || currentTs.imagewidth || 512;
    const nh = naturalRef.current.h || imgRef.current?.naturalHeight || currentTs.imageheight || 512;
    const minX = Math.max(0, Math.min(activeSlicer.x0, activeSlicer.x1));
    const maxX = Math.min(nw, Math.max(activeSlicer.x0, activeSlicer.x1));
    const minY = Math.max(0, Math.min(activeSlicer.y0, activeSlicer.y1));
    const maxY = Math.min(nh, Math.max(activeSlicer.y0, activeSlicer.y1));
    const cropW = Math.max(4, maxX - minX);
    const cropH = Math.max(4, maxY - minY);
    const offX = currentTs.offsetX ?? currentTs.margin ?? 0;
    const offY = currentTs.offsetY ?? currentTs.margin ?? 0;
    const spacing = currentTs.spacing ?? 0;

    const tileW = Math.max(1, currentTs.tilewidth || 16);
    const tileH = Math.max(1, currentTs.tileheight || 16);
    const maxRows = Math.max(1, Math.floor((nh - offY) / (tileH + spacing)));
    const spanW = Math.max(1, Math.round(cropW / (tileW + spacing)));
    const spanH = Math.max(1, Math.round(cropH / (tileH + spacing)));

    const startCol = Math.max(0, Math.min(currentTs.columns - 1, Math.floor((minX - offX) / (tileW + spacing))));
    const startRow = Math.max(0, Math.min(maxRows - 1, Math.floor((minY - offY) / (tileH + spacing))));

    const gids: number[][] = [];
    for (let r = 0; r < spanH; r++) {
      const rowGids: number[] = [];
      for (let c = 0; c < spanW; c++) {
        const cr = Math.min(maxRows - 1, startRow + r);
        const cc = Math.min(currentTs.columns - 1, startCol + c);
        rowGids.push(currentTs.firstgid + cr * currentTs.columns + cc);
      }
      gids.push(rowGids);
    }
    const topGid = gids[0]?.[0] ?? (currentTs.firstgid + startRow * currentTs.columns + startCol);
    isInternalSelectionRef.current = true;
    onBrushSelectRef.current(topGid);
    if (spanW > 1 || spanH > 1) {
      onBrushSelectPatternRef.current?.({ w: spanW, h: spanH, gids });
      useEditorStore.getState().setPrefabStampMode('footprint');
    } else {
      onBrushSelectPatternRef.current?.(null);
      useEditorStore.getState().setPrefabStampMode('1tile');
    }
    useEditorStore.getState().setBrushMode('paint');
    if (useEditorStore.getState().activeLayerIdx === -1) {
      useEditorStore.getState().setActiveLayerIdx(0);
    }
  }, [slicerSelection]);

  const handlePointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    if (e.button !== 0) return;
    const currentTs = tsRef.current;
    if (!currentTs || imgError || !imgRef.current) return;
    const nw = natural.w || imgRef.current.naturalWidth || currentTs.imagewidth || 512;
    const nh = natural.h || imgRef.current.naturalHeight || currentTs.imageheight || 512;
    if (!nw || !nh) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width - 1, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height - 1, e.clientY - rect.top));
    const scaleX = nw / rect.width;
    const scaleY = nh / rect.height;
    const nativeX = Math.floor(x * scaleX);
    const nativeY = Math.floor(y * scaleY);

    // Origin alignment click
    if (isCalibratingOrigin) {
      const ox = Math.max(0, nativeX);
      const oy = Math.max(0, nativeY);
      const cols = Math.max(1, Math.floor((nw - ox) / (currentTs.tilewidth + (currentTs.spacing || 0))));
      handleUpdateTilesetSettings({
        offsetX: ox,
        offsetY: oy,
        columns: cols,
        imagewidth: nw,
        imageheight: nh,
      });
      setIsCalibratingOrigin(false);
      showToast(`Grid origin set to X:${ox}px, Y:${oy}px (${cols} columns)`);
      soundSynth?.playSelectSound?.();
      return;
    }

    isPointerDownRef.current = true;

    // Freeform Slicer mode — start unconstrained crop drag
    if (selectionMode === 'slicer') {
      slicerDragStartRef.current = { x: nativeX, y: nativeY };
      const sel = {
        x0: nativeX,
        y0: nativeY,
        x1: Math.min(nw, nativeX + (currentTs.tilewidth || 16)),
        y1: Math.min(nh, nativeY + (currentTs.tileheight || 16)),
      };
      slicerSelectionRef.current = sel;
      setSlicerSelection(sel);
      return;
    }

    // Grid Mode
    const offX = currentTs.offsetX ?? currentTs.margin ?? 0;
    const offY = currentTs.offsetY ?? currentTs.margin ?? 0;
    const spacing = currentTs.spacing ?? 0;
    const col = Math.min(currentTs.columns - 1, Math.max(0, Math.floor((nativeX - offX) / (currentTs.tilewidth + spacing))));
    const maxRows = Math.max(1, Math.floor((nh - offY) / (currentTs.tileheight + spacing)));
    const row = Math.min(maxRows - 1, Math.max(0, Math.floor((nativeY - offY) / (currentTs.tileheight + spacing))));

    dragStartRef.current = { r: row, c: col };
    dragBoundsRef.current = { row, col, w: 1, h: 1 };
    setDragStart({ r: row, c: col });

    const gid = currentTs.firstgid + row * currentTs.columns + col;
    const leftPx = offX + col * (currentTs.tilewidth + spacing);
    const topPx = offY + row * (currentTs.tileheight + spacing);

    setHoveredTile({
      leftPct: (leftPx / nw) * 100,
      topPct: (topPx / nh) * 100,
      widthPct: (currentTs.tilewidth / nw) * 100,
      heightPct: (currentTs.tileheight / nh) * 100,
      gid,
      col,
      row,
      w: 1,
      h: 1,
    });

    selectTileRegion(row, col, 1, 1);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    const currentTs = tsRef.current;
    if (!currentTs || imgError || !imgRef.current) return;
    const nw = natural.w || imgRef.current.naturalWidth || currentTs.imagewidth || 512;
    const nh = natural.h || imgRef.current.naturalHeight || currentTs.imageheight || 512;
    if (!nw || !nh) return;

    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width - 1, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height - 1, e.clientY - rect.top));
    const scaleX = nw / rect.width;
    const scaleY = nh / rect.height;
    const nativeX = Math.floor(x * scaleX);
    const nativeY = Math.floor(y * scaleY);

    if (selectionMode === 'slicer') {
      const start = slicerDragStartRef.current;
      if (start && isPointerDownRef.current) {
        const x0 = Math.max(0, Math.min(start.x, nativeX));
        const x1 = Math.min(nw, Math.max(start.x, nativeX));
        const y0 = Math.max(0, Math.min(start.y, nativeY));
        const y1 = Math.min(nh, Math.max(start.y, nativeY));
        const sel = { x0, y0, x1: Math.max(x0 + 4, x1), y1: Math.max(y0 + 4, y1) };
        slicerSelectionRef.current = sel;
        setSlicerSelection(sel);
      }
      return;
    }

    // Grid Mode
    const offX = currentTs.offsetX ?? currentTs.margin ?? 0;
    const offY = currentTs.offsetY ?? currentTs.margin ?? 0;
    const spacing = currentTs.spacing ?? 0;
    const col = Math.min(currentTs.columns - 1, Math.max(0, Math.floor((nativeX - offX) / (currentTs.tilewidth + spacing))));
    const maxRows = Math.max(1, Math.floor((nh - offY) / (currentTs.tileheight + spacing)));
    const row = Math.min(maxRows - 1, Math.max(0, Math.floor((nativeY - offY) / (currentTs.tileheight + spacing))));

    let minRow = row;
    let maxRow = row;
    let minCol = col;
    let maxCol = col;

    const start = dragStartRef.current;
    if (start && isPointerDownRef.current) {
      minRow = Math.min(start.r, row);
      maxRow = Math.max(start.r, row);
      minCol = Math.min(start.c, col);
      maxCol = Math.max(start.c, col);
    }

    maxRow = Math.min(maxRow, maxRows - 1);
    maxCol = Math.min(maxCol, currentTs.columns - 1);

    const spanW = maxCol - minCol + 1;
    const spanH = maxRow - minRow + 1;
    const gid = currentTs.firstgid + minRow * currentTs.columns + minCol;
    const leftPx = offX + minCol * (currentTs.tilewidth + spacing);
    const topPx = offY + minRow * (currentTs.tileheight + spacing);
    const widthPx = spanW * currentTs.tilewidth + (spanW - 1) * spacing;
    const heightPx = spanH * currentTs.tileheight + (spanH - 1) * spacing;

    if (start && isPointerDownRef.current) {
      dragBoundsRef.current = { row: minRow, col: minCol, w: spanW, h: spanH };
    }

    setHoveredTile({
      leftPct: (leftPx / nw) * 100,
      topPct: (topPx / nh) * 100,
      widthPct: (widthPx / nw) * 100,
      heightPct: (heightPx / nh) * 100,
      gid,
      col: minCol,
      row: minRow,
      w: spanW,
      h: spanH,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}

    if (selectionModeRef.current === 'slicer') {
      commitSlicerSelectionToStamp();
    } else {
      const bounds = dragBoundsRef.current || (dragStartRef.current ? { row: dragStartRef.current.r, col: dragStartRef.current.c, w: 1, h: 1 } : null);
      if (bounds) {
        selectTileRegion(bounds.row, bounds.col, bounds.w, bounds.h);
      }
    }

    slicerDragStartRef.current = null;
    dragStartRef.current = null;
    dragBoundsRef.current = null;
    setDragStart(null);
  };

  // Window-level smooth dragging listener so pointer captures never drop
  useEffect(() => {
    const onWindowPointerMove = (e: PointerEvent) => {
      if (!isPointerDownRef.current) return;
      const currentTs = tsRef.current;
      if (!currentTs || !imgRef.current) return;
      const nw = naturalRef.current.w || imgRef.current.naturalWidth || currentTs.imagewidth || 512;
      const nh = naturalRef.current.h || imgRef.current.naturalHeight || currentTs.imageheight || 512;
      if (!nw || !nh) return;

      const rect = imgRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width - 1, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height - 1, e.clientY - rect.top));
      const scaleX = nw / rect.width;
      const scaleY = nh / rect.height;
      const nativeX = Math.floor(x * scaleX);
      const nativeY = Math.floor(y * scaleY);

      if (selectionModeRef.current === 'slicer') {
        const start = slicerDragStartRef.current;
        if (start) {
          const x0 = Math.max(0, Math.min(start.x, nativeX));
          const x1 = Math.min(nw, Math.max(start.x, nativeX));
          const y0 = Math.max(0, Math.min(start.y, nativeY));
          const y1 = Math.min(nh, Math.max(start.y, nativeY));
          const sel = { x0, y0, x1: Math.max(x0 + 4, x1), y1: Math.max(y0 + 4, y1) };
          slicerSelectionRef.current = sel;
          setSlicerSelection(sel);
        }
        return;
      }

      // Grid Mode Drag Selection
      const offX = currentTs.offsetX ?? currentTs.margin ?? 0;
      const offY = currentTs.offsetY ?? currentTs.margin ?? 0;
      const spacing = currentTs.spacing ?? 0;
      const col = Math.min(currentTs.columns - 1, Math.max(0, Math.floor((nativeX - offX) / (currentTs.tilewidth + spacing))));
      const maxRows = Math.max(1, Math.floor((nh - offY) / (currentTs.tileheight + spacing)));
      const row = Math.min(maxRows - 1, Math.max(0, Math.floor((nativeY - offY) / (currentTs.tileheight + spacing))));

      let minRow = row;
      let maxRow = row;
      let minCol = col;
      let maxCol = col;

      const start = dragStartRef.current;
      if (start) {
        minRow = Math.min(start.r, row);
        maxRow = Math.max(start.r, row);
        minCol = Math.min(start.c, col);
        maxCol = Math.max(start.c, col);
      }

      maxRow = Math.min(maxRow, maxRows - 1);
      maxCol = Math.min(maxCol, currentTs.columns - 1);

      const spanW = maxCol - minCol + 1;
      const spanH = maxRow - minRow + 1;
      const gid = currentTs.firstgid + minRow * currentTs.columns + minCol;
      const leftPx = offX + minCol * (currentTs.tilewidth + spacing);
      const topPx = offY + minRow * (currentTs.tileheight + spacing);
      const widthPx = spanW * currentTs.tilewidth + (spanW - 1) * spacing;
      const heightPx = spanH * currentTs.tileheight + (spanH - 1) * spacing;

      dragBoundsRef.current = { row: minRow, col: minCol, w: spanW, h: spanH };

      setHoveredTile({
        leftPct: (leftPx / nw) * 100,
        topPct: (topPx / nh) * 100,
        widthPct: (widthPx / nw) * 100,
        heightPct: (heightPx / nh) * 100,
        gid,
        col: minCol,
        row: minRow,
        w: spanW,
        h: spanH,
      });
    };

    const onWindowPointerUp = () => {
      if (isPointerDownRef.current) {
        isPointerDownRef.current = false;
        if (selectionModeRef.current === 'slicer') {
          commitSlicerSelectionToStamp();
        } else {
          const bounds = dragBoundsRef.current || (dragStartRef.current ? { row: dragStartRef.current.r, col: dragStartRef.current.c, w: 1, h: 1 } : null);
          if (bounds) {
            selectTileRegion(bounds.row, bounds.col, bounds.w, bounds.h);
          }
        }
        slicerDragStartRef.current = null;
        dragStartRef.current = null;
        dragBoundsRef.current = null;
        setDragStart(null);
      }
    };

    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
    };
  }, [selectTileRegion, commitSlicerSelectionToStamp]);

  // Tile Library Selection Handler with accurate GID mapping & instant brush activation
  const handleSelectTileDefinition = useCallback(
    (def: TileDefinition) => {
      soundSynth?.playSelectSound?.();
      setSelectedTileDefId(def.id);

      // Match against active map tilesets
      const cleanSource = def.sourceSheet.replace(/^\/game-assets\/tilesets\//i, '').replace(/^tilesets\//i, '');
      let matchingTsIdx = tilesets.findIndex(
        (t) =>
          t.imageSource.toLowerCase().includes(cleanSource.toLowerCase()) ||
          cleanSource.toLowerCase().includes(t.imageSource.toLowerCase())
      );

      let targetTs = matchingTsIdx !== -1 ? tilesets[matchingTsIdx] : ts;

      // If tileset not in active map tilesets, automatically add it
      if (matchingTsIdx === -1 && def.sourceSheet) {
        const nextFirstGid = tilesets.length > 0 ? Math.max(...tilesets.map((t) => t.firstgid)) + 100000 : 1;
        const newTs: TilesetMeta = {
          firstgid: nextFirstGid,
          imageSource: def.sourceSheet,
          columns: Math.max(1, Math.floor(512 / (def.sourceWidth || 16))),
          tilewidth: def.sourceWidth || 16,
          tileheight: def.sourceHeight || 16,
          imagewidth: 512,
          imageheight: 512,
          offsetX: 0,
          offsetY: 0,
          spacing: 0,
        };
        const updated = [...tilesets, newTs];
        onUpdateTilesets?.(updated);
        matchingTsIdx = updated.length - 1;
        targetTs = newTs;
      }

      if (targetTs) {
        if (matchingTsIdx !== -1 && matchingTsIdx !== activeTsIdx) {
          setActiveTsIdx(matchingTsIdx);
          setNatural({ w: 0, h: 0 });
          setHoveredTile(null);
          setImgError(false);
        }

        const offX = targetTs.offsetX ?? targetTs.margin ?? 0;
        const offY = targetTs.offsetY ?? targetTs.margin ?? 0;
        const spacing = targetTs.spacing ?? 0;
        const tileW = Math.max(1, targetTs.tilewidth || 16);
        const tileH = Math.max(1, targetTs.tileheight || 16);
        const maxRows = Math.max(
          1,
          Math.floor((natural.h || targetTs.imageheight || 512) / (tileH + spacing))
        );
        const col = Math.max(
          0,
          Math.min(targetTs.columns - 1, Math.floor((def.sourceX - offX) / (tileW + spacing)))
        );
        const row = Math.max(
          0,
          Math.min(maxRows - 1, Math.floor((def.sourceY - offY) / (tileH + spacing)))
        );

        const spanW = Math.max(1, Math.round(def.sourceWidth / (tileW + spacing)));
        const spanH = Math.max(1, Math.round(def.sourceHeight / (tileH + spacing)));

        isInternalSelectionRef.current = true;
        if (spanW > 1 || spanH > 1) {
          const gids: number[][] = [];
          for (let r = 0; r < spanH; r++) {
            const rowGids: number[] = [];
            for (let c = 0; c < spanW; c++) {
              const cr = Math.min(maxRows - 1, row + r);
              const cc = Math.min(targetTs.columns - 1, col + c);
              rowGids.push(targetTs.firstgid + cr * targetTs.columns + cc);
            }
            gids.push(rowGids);
          }
          const topGid = gids[0]?.[0] || targetTs.firstgid + row * targetTs.columns + col;
          onBrushSelectRef.current(topGid);
          onBrushSelectPatternRef.current?.({ w: spanW, h: spanH, gids });
          useEditorStore.getState().setPrefabStampMode('footprint');
        } else {
          const gid = def.gid || (targetTs.firstgid + row * targetTs.columns + col);
          onBrushSelectRef.current(gid);
          onBrushSelectPatternRef.current?.(null);
          useEditorStore.getState().setPrefabStampMode('1tile');
        }

        useEditorStore.getState().setBrushMode('paint');
        if (useEditorStore.getState().activeLayerIdx === -1) {
          useEditorStore.getState().setActiveLayerIdx(0);
        }
      } else {
        isInternalSelectionRef.current = true;
        onBrushSelectRef.current(def.gid);
        onBrushSelectPatternRef.current?.(null);
        useEditorStore.getState().setBrushMode('paint');
        useEditorStore.getState().setPrefabStampMode('1tile');
        if (useEditorStore.getState().activeLayerIdx === -1) {
          useEditorStore.getState().setActiveLayerIdx(0);
        }
      }

      showToast(`Selected Tile: ${def.name}`);
    },
    [tilesets, ts, activeTsIdx, natural.h, showToast, onUpdateTilesets]
  );

  // Open the Tilesheet Grid Calibration & Extraction Wizard
  const openExtractModal = useCallback((targetTs?: TilesetMeta | null) => {
    const current = targetTs || tsRef.current;
    if (!current) return;
    const nw = naturalRef.current.w || imgRef.current?.naturalWidth || current.imagewidth || 512;
    const nh = naturalRef.current.h || imgRef.current?.naturalHeight || current.imageheight || 512;
    const suggestion = suggestGridForImage(nw, nh);
    const initialSize = current.tilewidth && current.tilewidth !== 16 ? current.tilewidth : suggestion.size;

    setExtractTileWidth(initialSize);
    setExtractTileHeight(current.tileheight && current.tileheight !== 16 ? current.tileheight : initialSize);
    setExtractOffsetX(current.offsetX ?? current.margin ?? 0);
    setExtractOffsetY(current.offsetY ?? current.margin ?? 0);
    setExtractSpacing(current.spacing ?? 0);
    setExtractZoom(1);
    setExtractOriginPicking(false);
    setIsExtractModalOpen(true);
    soundSynth?.playActionSound?.();
  }, []);

  // Apply calibrated grid settings to map and optionally extract all tiles into Library
  const handleApplyExtractedGrid = useCallback(
    (andExtractToLibrary: boolean) => {
      const current = tsRef.current;
      if (!current) return;
      const nw = naturalRef.current.w || imgRef.current?.naturalWidth || current.imagewidth || 512;
      const nh = naturalRef.current.h || imgRef.current?.naturalHeight || current.imageheight || 512;
      const tw = Math.max(1, extractTileWidth || 32);
      const th = Math.max(1, extractTileHeight || 32);
      const offX = Math.max(0, extractOffsetX || 0);
      const offY = Math.max(0, extractOffsetY || 0);
      const sp = Math.max(0, extractSpacing || 0);
      const cols = Math.max(1, Math.floor((nw - offX) / (tw + sp)));
      const rows = Math.max(1, Math.floor((nh - offY) / (th + sp)));

      handleUpdateTilesetSettings({
        tilewidth: tw,
        tileheight: th,
        offsetX: offX,
        offsetY: offY,
        spacing: sp,
        columns: cols,
        imagewidth: nw,
        imageheight: nh,
      });

      if (current.imageSource) {
        TILESET_SIZES[current.imageSource] = { w: nw, h: nh };
        const base = current.imageSource.split('/').pop() || '';
        TILESET_SIZES[base] = { w: nw, h: nh };
      }

      if (andExtractToLibrary) {
        const sheetName = current.imageSource.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'sheet';
        const extracted: TileDefinition[] = [];
        const totalCap = 256;

        for (let r = 0; r < rows && extracted.length < totalCap; r++) {
          for (let c = 0; c < cols && extracted.length < totalCap; c++) {
            const gid = current.firstgid + r * cols + c;
            const srcX = offX + c * (tw + sp);
            const srcY = offY + r * (th + sp);
            extracted.push({
              id: `extracted-${sheetName}-${r}-${c}-${Date.now()}`,
              name: `${sheetName.replace(/_/g, ' ')} [R${r}:C${c}]`,
              sourceSheet: current.imageSource,
              sourceX: srcX,
              sourceY: srcY,
              sourceWidth: tw,
              sourceHeight: th,
              gid,
              tags: ['terrain', 'extracted', sheetName.toLowerCase()],
              collision: 'NONE',
              gameplayFlags: ['walkable'],
              material: 'GRASS',
            });
          }
        }

        addTileDefinitions(extracted);
        if (extracted.length > 0) {
          setSelectedTileDefId(extracted[0].id);
          isInternalSelectionRef.current = true;
          onBrushSelectRef.current(extracted[0].gid);
          onBrushSelectPatternRef.current?.(null);
          useEditorStore.getState().setBrushMode('paint');
          useEditorStore.getState().setPrefabStampMode('1tile');
          if (useEditorStore.getState().activeLayerIdx === -1) {
            useEditorStore.getState().setActiveLayerIdx(0);
          }
          setActiveTab('library');
        }
        showToast(`Calibrated grid & extracted ${extracted.length} tiles to Library!`);
      } else {
        showToast(`Applied ${tw}×${th}px grid alignment (${cols} cols × ${rows} rows)`);
      }

      soundSynth?.playActionSound?.();
      setIsExtractModalOpen(false);
    },
    [
      extractTileWidth,
      extractTileHeight,
      extractOffsetX,
      extractOffsetY,
      extractSpacing,
      handleUpdateTilesetSettings,
      addTileDefinitions,
      setSelectedTileDefId,
      showToast,
    ]
  );

  // Extract all tiles from active tileset sheet into the Library (redirects to Calibration Wizard)
  const handleExtractTilesFromActiveSheet = useCallback(() => {
    openExtractModal();
  }, [openExtractModal]);

  // Slicer Action Handlers
  const handleSlicerStamp1Tile = () => {
    if (!ts || !slicerSelection) return;
    soundSynth?.playActionSound?.();
    const offX = ts.offsetX ?? ts.margin ?? 0;
    const offY = ts.offsetY ?? ts.margin ?? 0;
    const spacing = ts.spacing ?? 0;
    const minX = Math.min(slicerSelection.x0, slicerSelection.x1);
    const minY = Math.min(slicerSelection.y0, slicerSelection.y1);
    const col = Math.min(ts.columns - 1, Math.max(0, Math.floor((minX - offX) / (ts.tilewidth + spacing))));
    const maxRows = Math.max(1, Math.floor((natural.h - offY) / (ts.tileheight + spacing)));
    const row = Math.min(maxRows - 1, Math.max(0, Math.floor((minY - offY) / (ts.tileheight + spacing))));
    const gid = ts.firstgid + row * ts.columns + col;
    isInternalSelectionRef.current = true;
    onBrushSelectRef.current(gid);
    onBrushSelectPatternRef.current?.(null);
    useEditorStore.getState().setPrefabStampMode('1tile');
    useEditorStore.getState().setBrushMode('paint');
    showToast(`Selected 1 Tile (GID #${gid})`);
  };

  const handleSlicerStampMultiTile = () => {
    if (!ts || !slicerSelection) return;
    soundSynth?.playActionSound?.();
    const offX = ts.offsetX ?? ts.margin ?? 0;
    const offY = ts.offsetY ?? ts.margin ?? 0;
    const spacing = ts.spacing ?? 0;
    const minX = Math.max(0, Math.min(slicerSelection.x0, slicerSelection.x1));
    const minY = Math.max(0, Math.min(slicerSelection.y0, slicerSelection.y1));
    const maxX = Math.min(natural.w || 512, Math.max(slicerSelection.x0, slicerSelection.x1));
    const maxY = Math.min(natural.h || 512, Math.max(slicerSelection.y0, slicerSelection.y1));
    const cropW = Math.max(4, maxX - minX);
    const cropH = Math.max(4, maxY - minY);

    const tileW = Math.max(1, ts.tilewidth || 16);
    const tileH = Math.max(1, ts.tileheight || 16);
    const maxRows = Math.max(1, Math.floor((natural.h - offY) / (tileH + spacing)));
    const spanW = Math.max(1, Math.round(cropW / (tileW + spacing)));
    const spanH = Math.max(1, Math.round(cropH / (tileH + spacing)));

    const startCol = Math.max(0, Math.min(ts.columns - 1, Math.floor((minX - offX) / (tileW + spacing))));
    const startRow = Math.max(0, Math.min(maxRows - 1, Math.floor((minY - offY) / (tileH + spacing))));

    const gids: number[][] = [];
    for (let r = 0; r < spanH; r++) {
      const rowGids: number[] = [];
      for (let c = 0; c < spanW; c++) {
        const cr = Math.min(maxRows - 1, startRow + r);
        const cc = Math.min(ts.columns - 1, startCol + c);
        rowGids.push(ts.firstgid + cr * ts.columns + cc);
      }
      gids.push(rowGids);
    }
    const topGid = gids[0]?.[0] ?? (ts.firstgid + startRow * ts.columns + startCol);
    isInternalSelectionRef.current = true;
    onBrushSelectRef.current(topGid);
    if (spanW > 1 || spanH > 1) {
      onBrushSelectPatternRef.current?.({ w: spanW, h: spanH, gids });
      useEditorStore.getState().setPrefabStampMode('footprint');
    } else {
      onBrushSelectPatternRef.current?.(null);
      useEditorStore.getState().setPrefabStampMode('1tile');
    }
    useEditorStore.getState().setBrushMode('paint');
    if (useEditorStore.getState().activeLayerIdx === -1) {
      useEditorStore.getState().setActiveLayerIdx(0);
    }
    showToast(`Selected ${spanW}×${spanH} Tile Stamp (${cropW}×${cropH}px)`);
  };

  const handleSlicerAutoPrefab = async () => {
    if (!ts || !slicerSelection) return;
    soundSynth?.playActionSound?.();
    const offX = ts.offsetX ?? ts.margin ?? 0;
    const offY = ts.offsetY ?? ts.margin ?? 0;
    const spacing = ts.spacing ?? 0;
    const minX = Math.max(0, Math.min(slicerSelection.x0, slicerSelection.x1));
    const minY = Math.max(0, Math.min(slicerSelection.y0, slicerSelection.y1));
    const maxX = Math.min(natural.w || 512, Math.max(slicerSelection.x0, slicerSelection.x1));
    const maxY = Math.min(natural.h || 512, Math.max(slicerSelection.y0, slicerSelection.y1));
    const cropW = Math.max(4, maxX - minX);
    const cropH = Math.max(4, maxY - minY);

    const tileW = Math.max(1, ts.tilewidth || 16);
    const tileH = Math.max(1, ts.tileheight || 16);
    const maxRows = Math.max(1, Math.floor((natural.h - offY) / (tileH + spacing)));
    const spanW = Math.max(1, Math.round(cropW / (tileW + spacing)));
    const spanH = Math.max(1, Math.round(cropH / (tileH + spacing)));

    const startCol = Math.max(0, Math.min(ts.columns - 1, Math.floor((minX - offX) / (tileW + spacing))));
    const startRow = Math.max(0, Math.min(maxRows - 1, Math.floor((minY - offY) / (tileH + spacing))));

    const visualData: PrefabTileData[] = [];
    for (let r = 0; r < spanH; r++) {
      for (let c = 0; c < spanW; c++) {
        const tr = Math.min(maxRows - 1, startRow + r);
        const tc = Math.min(ts.columns - 1, startCol + c);
        const tileId = ts.firstgid + tr * ts.columns + tc;
        visualData.push({ layerOffset: 0, r, c, tileId });
      }
    }

    if (visualData.length === 0) {
      showToast('Selected area contains no valid tiles.');
      return;
    }

    const prefabName = `Custom Stamp (${cropW}x${cropH}px)`;
    const res = await savePrefab({
      name: prefabName,
      category: 'decor',
      width: spanW,
      height: spanH,
      visualData,
      logicData: [],
    });

    if (res.success) {
      showToast(`Stamp Created: ${prefabName}`);
      const listRes = await listPrefabs();
      if (listRes.success && listRes.data) {
        setPrefabs(listRes.data);
        const newPrefab = listRes.data.find((p: any) => p.name === prefabName);
        if (newPrefab) {
          setActivePrefabId(newPrefab.id);
        }
      }
      setBrushMode('prefab');
      openPanel('prefab');
    } else {
      showToast(`Failed to save stamp: ${res.error}`);
    }
  };

  const handleSlicerQuickExtract = () => {
    if (!ts || !slicerSelection) return;
    soundSynth?.playActionSound?.();
    const offX = ts.offsetX ?? ts.margin ?? 0;
    const offY = ts.offsetY ?? ts.margin ?? 0;
    const spacing = ts.spacing ?? 0;
    const minX = Math.max(0, Math.min(slicerSelection.x0, slicerSelection.x1));
    const minY = Math.max(0, Math.min(slicerSelection.y0, slicerSelection.y1));
    const maxX = Math.min(natural.w || 512, Math.max(slicerSelection.x0, slicerSelection.x1));
    const maxY = Math.min(natural.h || 512, Math.max(slicerSelection.y0, slicerSelection.y1));
    const cropW = Math.max(4, maxX - minX);
    const cropH = Math.max(4, maxY - minY);
    const sheetName = ts.imageSource.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'sheet';

    const tileW = Math.max(1, ts.tilewidth || 16);
    const tileH = Math.max(1, ts.tileheight || 16);
    const maxRows = Math.max(1, Math.floor((natural.h - offY) / (tileH + spacing)));
    const startCol = Math.max(0, Math.min(ts.columns - 1, Math.floor((minX - offX) / (tileW + spacing))));
    const startRow = Math.max(0, Math.min(maxRows - 1, Math.floor((minY - offY) / (tileH + spacing))));
    const topGid = ts.firstgid + startRow * ts.columns + startCol;

    const newDef: TileDefinition = {
      id: `extracted-${sheetName}-${Date.now()}`,
      name: `${sheetName.replace(/_/g, ' ')} (${cropW}×${cropH})`,
      sourceSheet: ts.imageSource,
      sourceX: minX,
      sourceY: minY,
      sourceWidth: cropW,
      sourceHeight: cropH,
      gid: topGid,
      tags: ['sliced', 'custom', sheetName.toLowerCase()],
      collision: 'NONE',
      gameplayFlags: ['walkable'],
      material: 'GRASS',
      thumbnailUrl: ts.imageSource.startsWith('/') || ts.imageSource.startsWith('http')
        ? ts.imageSource
        : `/game-assets/tilesets/${ts.imageSource}`,
    };

    addTileDefinitions([newDef]);
    handleSelectTileDefinition(newDef);
    setLibraryFilter('');
    setLibraryTagFilter('ALL');
    setActiveTab('library');
    showToast(`Extracted ${cropW}×${cropH}px Tile to Library & Activated Brush!`);
  };

  const handleSlicerSaveDefinition = () => {
    if (!ts || !slicerSelection) return;
    soundSynth?.playActionSound?.();
    const minX = Math.max(0, Math.min(slicerSelection.x0, slicerSelection.x1));
    const minY = Math.max(0, Math.min(slicerSelection.y0, slicerSelection.y1));
    const maxX = Math.min(natural.w || 512, Math.max(slicerSelection.x0, slicerSelection.x1));
    const maxY = Math.min(natural.h || 512, Math.max(slicerSelection.y0, slicerSelection.y1));
    const cropW = Math.max(4, maxX - minX);
    const cropH = Math.max(4, maxY - minY);
    const offX = ts.offsetX ?? ts.margin ?? 0;
    const offY = ts.offsetY ?? ts.margin ?? 0;
    const spacing = ts.spacing ?? 0;
    const tileW = Math.max(1, ts.tilewidth || 16);
    const tileH = Math.max(1, ts.tileheight || 16);
    const maxRows = Math.max(1, Math.floor((natural.h - offY) / (tileH + spacing)));
    const startCol = Math.max(0, Math.min(ts.columns - 1, Math.floor((minX - offX) / (tileW + spacing))));
    const startRow = Math.max(0, Math.min(maxRows - 1, Math.floor((minY - offY) / (tileH + spacing))));
    const topGid = ts.firstgid + startRow * ts.columns + startCol;

    setPendingDef({
      sourceSheet: ts.imageSource,
      sourceX: minX,
      sourceY: minY,
      sourceWidth: cropW,
      sourceHeight: cropH,
      gid: topGid,
      name: `Custom Tile (${cropW}x${cropH})`,
      collision: 'NONE',
      material: 'GRASS',
      tags: ['sliced', 'custom'],
    });
    setIsSaveDefModalOpen(true);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!ts || imgError || !natural.w || !natural.h) return;
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA' ||
          document.activeElement.tagName === 'SELECT')
      ) {
        return;
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const local = activeBrushTileId - ts.firstgid;
        if (local < 0) return;
        const maxRows = Math.max(1, Math.floor(natural.h / ts.tileheight));
        const col = local % ts.columns;
        const row = Math.floor(local / ts.columns);

        const stepX = 1;
        const stepY = 1;
        
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const nextCol = Math.max(0, col - stepX);
          if (nextCol !== col) selectTileRegion(row, nextCol, 1, 1);
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          const nextCol = Math.min(ts.columns - stepX, col + stepX);
          if (nextCol !== col) selectTileRegion(row, nextCol, 1, 1);
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          const nextRow = Math.max(0, row - stepY);
          if (nextRow !== row) selectTileRegion(nextRow, col, 1, 1);
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const nextRow = Math.min(maxRows - stepY, row + stepY);
          if (nextRow !== row) selectTileRegion(nextRow, col, 1, 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ts, imgError, natural, activeBrushTileId, selectTileRegion]);

  useEffect(() => {
    const handleGlobalClick = () => setTileContextMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTileContextMenu(null);
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleContextMenu = (e: React.MouseEvent<HTMLImageElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!ts || imgError || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleX = natural.w / rect.width;
    const scaleY = natural.h / rect.height;
    const nativeX = Math.floor(x * scaleX);
    const nativeY = Math.floor(y * scaleY);
    const offX = ts.offsetX ?? ts.margin ?? 0;
    const offY = ts.offsetY ?? ts.margin ?? 0;
    const spacing = ts.spacing ?? 0;
    const col = Math.floor((nativeX - offX) / (ts.tilewidth + spacing));
    const row = Math.floor((nativeY - offY) / (ts.tileheight + spacing));

    if (col < 0 || row < 0 || col >= ts.columns || nativeY >= natural.h) return;

    const spanW = 1;
    const spanH = 1;
    const localId = row * ts.columns + col;
    const gid = ts.firstgid + localId;

    let dataUrl: string | undefined = undefined;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = ts.tilewidth * spanW;
      canvas.height = ts.tileheight * spanH;
      const ctx = canvas.getContext('2d');
      if (ctx && imgRef.current) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          imgRef.current,
          offX + col * (ts.tilewidth + spacing),
          offY + row * (ts.tileheight + spacing),
          ts.tilewidth * spanW,
          ts.tileheight * spanH,
          0,
          0,
          ts.tilewidth * spanW,
          ts.tileheight * spanH
        );
        dataUrl = canvas.toDataURL('image/png');
      }
    } catch {
      /* fallback */
    }

    soundSynth?.playUiClick?.();
    setTileContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 260),
      y: Math.min(e.clientY, window.innerHeight - 380),
      gid,
      row,
      col,
      w: spanW,
      h: spanH,
      localId,
      ts,
      dataUrl,
    });
  };

  const handleSaveAsTileDefinition = async (def: Partial<TileDefinition>) => {
    if (!def.name || !def.sourceSheet) {
      showToast('Tile name and source sheet are required.');
      return;
    }
    soundSynth?.playActionSound?.();
    const sheetName = def.sourceSheet.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'sheet';
    const newDef: TileDefinition = {
      id: def.id || `custom-${sheetName}-${Date.now()}`,
      name: def.name,
      sourceSheet: def.sourceSheet,
      sourceX: def.sourceX || 0,
      sourceY: def.sourceY || 0,
      sourceWidth: def.sourceWidth || 16,
      sourceHeight: def.sourceHeight || 16,
      gid: def.gid || 1,
      tags: def.tags || ['tile', 'custom'],
      collision: def.collision || 'NONE',
      gameplayFlags: def.gameplayFlags || ['walkable'],
      material: def.material || 'GRASS',
      thumbnailUrl: def.sourceSheet.startsWith('/') || def.sourceSheet.startsWith('http')
        ? def.sourceSheet
        : `/game-assets/tilesets/${def.sourceSheet}`,
    };

    addTileDefinitions([newDef]);
    setSelectedTileDefId(newDef.id);
    onBrushSelectRef.current(newDef.gid);
    setIsSaveDefModalOpen(false);
    setPendingDef(null);
    setLibraryFilter('');
    setLibraryTagFilter('ALL');
    setActiveTab('library');
    showToast(`Saved "${newDef.name}" to Tile Library.`);

    try {
      const manager = AssetManager.getInstance();
      await manager.registerAsset({
        type: 'TILE',
        source: newDef.sourceSheet,
        metadata: {
          originalName: newDef.name,
          sourceSheet: newDef.sourceSheet,
          sourceRegion: {
            x: newDef.sourceX,
            y: newDef.sourceY,
            w: newDef.sourceWidth,
            h: newDef.sourceHeight,
          },
          gid: newDef.gid,
          collision: newDef.collision,
          gameplayFlags: newDef.gameplayFlags,
          material: newDef.material,
        },
        tags: newDef.tags,
      });
    } catch {
      // Local state is already updated and persistent
    }
  };

  return (
    <div className="flex flex-col gap-2 font-mono select-none">
      {/* ─── TAB SWITCHER ─── */}
      <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-amber-500/20">
        <button
          type="button"
          onClick={() => {
            soundSynth?.playUiClick?.();
            setActiveTab('palette');
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-bold transition cursor-pointer ${
            activeTab === 'palette'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span>Tileset Palette</span>
        </button>
        <button
          type="button"
          onClick={() => {
            soundSynth?.playUiClick?.();
            setActiveTab('library');
            void loadTileLibrary();
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-bold transition cursor-pointer ${
            activeTab === 'library'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Tile Library ({tileDefinitions.length})</span>
        </button>
      </div>

      {activeTab === 'palette' ? (
        <>
          <p className="text-[10px] leading-relaxed text-slate-400">
            Click or drag across tiles to select a brush. <span className="text-amber-300 font-bold">Right-click any tile</span> for layer fill, options, and collision tags.
          </p>

          {/* TILE LAYERS */}
          <div className="flex flex-col gap-1 bg-black/60 p-2 rounded-xl border border-amber-500/20">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                TILE LAYERS
              </span>
              <button
                type="button"
                onClick={() => {
                  soundSynth?.playActionSound?.();
                  onAddLayer();
                }}
                className="text-[10px] bg-amber-600 hover:bg-amber-500 text-white font-bold px-2 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Layer
              </button>
            </div>

            {/* Logic / Collision Layer Quick Switch */}
            <div
              onClick={() => {
                soundSynth?.playUiClick?.();
                onLayerChange(-1);
              }}
              className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer border ${
                activeLayerIdx === -1
                  ? 'bg-rose-950/40 text-rose-200 border-rose-500/50 font-bold'
                  : 'bg-[#0b1320] text-slate-400 hover:bg-white/5 border-transparent'
              }`}
              title="Switch to Logic Mode & Open Logic Painter"
            >
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <Shield className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-xs truncate">Logic Layer (−1)</span>
                {activeLayerIdx === -1 && (
                  <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 flex-shrink-0">
                    ACTIVE
                  </span>
                )}
              </div>
              <span className="text-[9px] text-slate-500 font-mono">Open Logic Painter</span>
            </div>

            {tileLayers.map((layer, idx) => (
              <div
                key={idx}
                onClick={() => {
                  soundSynth?.playUiClick?.();
                  onLayerChange(idx);
                }}
                className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeLayerIdx === idx
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 font-bold'
                    : 'bg-[#0b1320] text-slate-400 hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-xs truncate">L{idx}: {layer.name}</span>
                  {activeLayerIdx === idx && (
                    <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 flex-shrink-0">
                      ACTIVE
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  {onClearLayer && (
                    <button
                      type="button"
                      title={`Clear all tiles on Layer ${idx}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearLayer(idx);
                      }}
                      className="p-1 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 rounded transition cursor-pointer"
                    >
                      <Eraser className="w-3 h-3" />
                    </button>
                  )}
                  {idx > 0 && onDeleteLayer && (
                    <button
                      type="button"
                      title={`Delete Layer ${idx}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteLayer(idx);
                      }}
                      className="p-1 hover:bg-red-500/30 text-red-400 rounded transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ACTIVE TILESET HEADER & SELECTION */}
          <div className="flex flex-col gap-1 bg-black/60 p-2 rounded-xl border border-amber-500/20">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold text-amber-400/80 flex items-center gap-1.5">
                <Grid className="w-3 h-3 text-amber-400" />
                ACTIVE TILESETS ({tilesets.length})
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    soundSynth?.playActionSound?.();
                    setIsAddModalOpen(true);
                  }}
                  className="text-[10px] bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 font-bold px-2 py-0.5 rounded flex items-center gap-1 transition cursor-pointer"
                  title="Add Tileset from Asset Catalog"
                >
                  <Plus className="w-3 h-3" /> Add Tileset
                </button>
                {ts && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsSettingsModalOpen(true)}
                      className="text-[10px] text-slate-400 hover:text-white hover:bg-slate-700/50 p-1 rounded transition cursor-pointer"
                      title="Tileset Dimensions & Properties"
                    >
                      <Settings className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveTileset(activeTsIdx)}
                      className="text-[10px] text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/20 p-1 rounded transition cursor-pointer"
                      title="Remove current tileset from map"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {tilesets.length > 3 && (
              <div className="relative mb-1">
                <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tilesets..."
                  value={tilesetSearch}
                  onChange={(e) => setTilesetSearch(e.target.value)}
                  className="w-full bg-[#050b14] border border-slate-700 rounded-lg pl-6 pr-2 py-1 text-[10px] text-slate-200 focus:outline-none focus:border-amber-400"
                />
              </div>
            )}

            {filteredTilesets.length > 0 ? (
              <select 
                value={activeTsIdx} 
                onChange={(e) => {
                  soundSynth?.playUiClick?.();
                  setActiveTsIdx(parseInt(e.target.value));
                  setNatural({ w: 0, h: 0 });
                  setHoveredTile(null);
                  setImgError(false);
                }}
                className="w-full bg-[#050b14] border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                {filteredTilesets.map(({ t, originalIdx }) => (
                  <option key={originalIdx} value={originalIdx}>
                    {t.imageSource} (ID {t.firstgid}+)
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-[11px] text-amber-300/70 italic px-2 py-1.5 bg-black/40 border border-amber-500/20 rounded-lg flex items-center justify-between">
                <span>{tilesets.length === 0 ? 'No tilesets in map' : 'No matching tilesets'}</span>
                {tilesets.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="text-[10px] font-bold text-amber-400 underline cursor-pointer"
                  >
                    + Add One
                  </button>
                )}
              </div>
            )}
          </div>

          {/* MODE SELECTOR (GRID MODE vs FREEFORM CROP) */}
          {ts && !imgError && natural.w > 0 && (
            <div className="flex items-center justify-between gap-1 bg-black/80 p-1.5 rounded-xl border border-amber-500/20 text-[10px] mt-1">
              <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-lg border border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    soundSynth?.playUiClick?.();
                    setSelectionMode('grid');
                    setIsCalibratingOrigin(false);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                    selectionMode === 'grid'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Grid className="w-3 h-3" />
                  <span>Grid Mode</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundSynth?.playUiClick?.();
                    setSelectionMode('slicer');
                    setIsCalibratingOrigin(false);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                    selectionMode === 'slicer'
                      ? 'bg-fuchsia-500 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Scissors className="w-3 h-3" />
                  <span>Freeform Crop</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Calibrate & Extract Wizard Button */}
                <button
                  type="button"
                  onClick={() => openExtractModal()}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition cursor-pointer"
                  title="Open interactive grid calibration and sheet extraction wizard"
                >
                  <Scissors className="w-3 h-3" />
                  <span>Calibrate & Extract</span>
                </button>

                {/* Align Grid Origin Button */}
                {selectionMode === 'grid' && (
                  <button
                    type="button"
                    onClick={() => {
                      soundSynth?.playUiClick?.();
                      setIsCalibratingOrigin((prev) => !prev);
                      if (!isCalibratingOrigin) {
                        showToast('Click top-left corner of any tile on the sheet to align grid.');
                      }
                    }}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                      isCalibratingOrigin
                        ? 'bg-red-500 text-white animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]'
                        : 'bg-white/5 text-amber-300 hover:bg-white/10 border border-amber-500/30'
                    }`}
                    title="Click top-left of first tile to align grid position"
                  >
                    <Target className="w-3 h-3" />
                    <span>{isCalibratingOrigin ? 'Click Sheet...' : 'Align Grid'}</span>
                  </button>
                )}

                {/* Show Grid Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    soundSynth?.playUiClick?.();
                    setShowGridOverlay((prev) => !prev);
                  }}
                  className={`flex items-center gap-1 px-1.5 py-1 rounded text-[9px] font-bold transition cursor-pointer ${
                    showGridOverlay
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                      : 'bg-white/5 text-slate-400 hover:text-slate-200 border border-white/10'
                  }`}
                  title="Toggle visible grid overlay"
                >
                  <Grid className="w-3 h-3" />
                  <span>{showGridOverlay ? 'Grid On' : 'Grid Off'}</span>
                </button>

                {/* Zoom Steppers */}
                <div className="flex items-center gap-0.5 bg-black/50 border border-slate-700/60 rounded px-1 py-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundSynth?.playUiClick?.();
                      setZoomLevel((z) => Math.max(0.25, Number((z - 0.25).toFixed(2))));
                    }}
                    className="text-slate-400 hover:text-white px-1 text-[10px] font-bold cursor-pointer"
                    title="Zoom Out"
                  >
                    -
                  </button>
                  <span className="text-[9px] font-bold text-amber-300/90 w-8 text-center font-mono">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      soundSynth?.playUiClick?.();
                      setZoomLevel((z) => Math.min(4, Number((z + 0.25).toFixed(2))));
                    }}
                    className="text-slate-400 hover:text-white px-1 text-[10px] font-bold cursor-pointer"
                    title="Zoom In"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── GRID ALIGNMENT & OFFSET CONTROLS ─── */}
          {ts && natural.w > 0 && selectionMode === 'grid' && (
            <div className="flex flex-col gap-1.5 bg-black/60 p-2 rounded-xl border border-amber-500/20 text-xs font-mono mt-0.5">
              <div className="flex items-center justify-between">
                <span className="text-amber-400 font-bold text-[10px] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  GRID ALIGNMENT & OFFSETS
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundSynth?.playActionSound?.();
                      useEditorStore.getState().markMapDirty();
                      window.dispatchEvent(new CustomEvent(STUDIO_TRIGGER_SAVE_MAP_EVENT));
                      showToast(`Saved grid offsets (${ts.offsetX ?? 0}px, ${ts.offsetY ?? 0}px) to map`);
                    }}
                    className="text-[9px] px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-1 font-bold shadow-sm cursor-pointer transition-all"
                    title="Save current grid offsets and tileset settings to the active map"
                  >
                    <Save className="w-2.5 h-2.5" /> Save Offsets
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundSynth?.playUiClick?.();
                      const cols = Math.max(1, Math.floor(natural.w / ts.tilewidth));
                      handleUpdateTilesetSettings({ offsetX: 0, offsetY: 0, spacing: 0, columns: cols });
                      showToast('Reset grid alignment to 0,0');
                    }}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 flex items-center gap-1"
                  >
                    <RotateCcw className="w-2.5 h-2.5" /> Reset
                  </button>
                </div>
              </div>

              {/* Offset X & Offset Y Controls */}
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="flex items-center justify-between bg-black/40 px-2 py-1 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Offset X:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(0, (ts.offsetX ?? 0) - 1);
                        handleUpdateTilesetSettings({ offsetX: next });
                      }}
                      className="w-5 h-5 flex items-center justify-center bg-white/5 hover:bg-white/15 rounded text-slate-300 font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={ts.offsetX ?? 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          handleUpdateTilesetSettings({ offsetX: Math.max(0, val) });
                        }
                      }}
                      className="w-10 text-center font-bold text-amber-300 font-mono bg-black/60 border border-slate-700 rounded px-0.5 py-0 text-[10px] focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = (ts.offsetX ?? 0) + 1;
                        handleUpdateTilesetSettings({ offsetX: next });
                      }}
                      className="w-5 h-5 flex items-center justify-center bg-white/5 hover:bg-white/15 rounded text-slate-300 font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-black/40 px-2 py-1 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Offset Y:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(0, (ts.offsetY ?? 0) - 1);
                        handleUpdateTilesetSettings({ offsetY: next });
                      }}
                      className="w-5 h-5 flex items-center justify-center bg-white/5 hover:bg-white/15 rounded text-slate-300 font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={ts.offsetY ?? 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          handleUpdateTilesetSettings({ offsetY: Math.max(0, val) });
                        }
                      }}
                      className="w-10 text-center font-bold text-amber-300 font-mono bg-black/60 border border-slate-700 rounded px-0.5 py-0 text-[10px] focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = (ts.offsetY ?? 0) + 1;
                        handleUpdateTilesetSettings({ offsetY: next });
                      }}
                      className="w-5 h-5 flex items-center justify-center bg-white/5 hover:bg-white/15 rounded text-slate-300 font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Nudge Arrows & Tile Spacing */}
              <div className="flex items-center justify-between gap-1 text-[10px]">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-[9px] mr-1">Nudge:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(0, (ts.offsetX ?? 0) - 1);
                      handleUpdateTilesetSettings({ offsetX: next });
                    }}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200"
                    title="Nudge Left 1px"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = (ts.offsetX ?? 0) + 1;
                      handleUpdateTilesetSettings({ offsetX: next });
                    }}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200"
                    title="Nudge Right 1px"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(0, (ts.offsetY ?? 0) - 1);
                      handleUpdateTilesetSettings({ offsetY: next });
                    }}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200"
                    title="Nudge Up 1px"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = (ts.offsetY ?? 0) + 1;
                      handleUpdateTilesetSettings({ offsetY: next });
                    }}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200"
                    title="Nudge Down 1px"
                  >
                    ↓
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-[9px]">Spacing:</span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(0, (ts.spacing ?? 0) - 1);
                        handleUpdateTilesetSettings({ spacing: next });
                      }}
                      className="w-4 h-4 flex items-center justify-center bg-white/5 hover:bg-white/15 rounded text-slate-300 font-bold text-[9px]"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-bold text-amber-300 font-mono text-[9px]">{ts.spacing ?? 0}px</span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = (ts.spacing ?? 0) + 1;
                        handleUpdateTilesetSettings({ spacing: next });
                      }}
                      className="w-4 h-4 flex items-center justify-center bg-white/5 hover:bg-white/15 rounded text-slate-300 font-bold text-[9px]"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── BRUSH SCALE / DIMENSION CHANGING BAR ─── */}
          {ts && !imgError && natural.w > 0 && selectionMode === 'grid' && (
            <div className="flex items-center justify-between gap-1 bg-black/60 px-2 py-1.5 rounded-lg border border-white/5 text-[9px] mt-0.5">
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-bold uppercase text-[8px] mr-1">Brush Scale:</span>
                {[1, 2, 3, 4].map((scale) => {
                  const isCurrentScale = (selection?.w === scale && selection?.h === scale) || (!selection && scale === 1);
                  return (
                    <button
                      key={scale}
                      type="button"
                      onClick={() => handleSetBrushScale(scale, scale)}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${
                        isCurrentScale
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
                      }`}
                      title={`Scale selection to ${scale}×${scale} tiles (${scale * ts.tilewidth}×${scale * ts.tileheight}px)`}
                    >
                      {scale}×{scale}
                    </button>
                  );
                })}
              </div>

              {/* Grid Size preset quick options */}
              <div className="flex items-center gap-1">
                <span className="text-slate-500 text-[8px]">Tile:</span>
                {[16, 24, 32, 48].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      soundSynth?.playUiClick?.();
                      handleUpdateTilesetSettings({ tilewidth: size, tileheight: size });
                      showToast(`Tile size: ${size}×${size}px`);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                      ts.tilewidth === size && ts.tileheight === size
                        ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/40'
                        : 'text-slate-400 hover:text-white bg-black/40'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CALIBRATION BANNER */}
          {isCalibratingOrigin && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[10px] text-red-200 animate-pulse mt-1">
              <div className="flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-red-400 animate-spin" />
                <span>Click the top-left corner of any tile on the sheet to align grid</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCalibratingOrigin(false)}
                className="text-[9px] font-bold bg-black/60 px-1.5 py-0.5 rounded text-slate-300 hover:text-white"
              >
                Cancel
              </button>
            </div>
          )}

          {/* CROP ACTION BAR */}
          {selectionMode === 'slicer' && slicerSelection && ts && (
            <div className="bg-fuchsia-950/50 border border-fuchsia-500/40 rounded-xl p-2 flex flex-wrap items-center justify-between gap-2 shadow-lg backdrop-blur-md mt-1">
              <div className="flex items-center gap-2">
                <div className="px-2 py-0.5 rounded bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300 font-mono font-bold text-[10px]">
                  {slicerSelection.x1 - slicerSelection.x0} × {slicerSelection.y1 - slicerSelection.y0} px
                </div>
                <span className="text-[10px] text-slate-300">
                  Approx {Math.max(1, Math.round((slicerSelection.x1 - slicerSelection.x0) / ts.tilewidth))}×{Math.max(1, Math.round((slicerSelection.y1 - slicerSelection.y0) / ts.tileheight))} tiles
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSlicerStamp1Tile}
                  className="px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow transition"
                  title="Use as single tile brush"
                >
                  <Box className="w-3 h-3" />
                  <span>1-Tile Brush</span>
                </button>

                <div className="flex items-center bg-amber-500/20 border border-amber-500/40 rounded p-0.5">
                  <button
                    type="button"
                    onClick={handleSlicerStampMultiTile}
                    className="px-2 py-1 rounded bg-amber-500/30 hover:bg-amber-500/50 text-amber-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                    title="Use as multi-tile stamp"
                  >
                    <Grid className="w-3 h-3" />
                    <span>Multi-Tile Stamp</span>
                  </button>
                  <div className="flex items-center gap-0.5 border-l border-amber-500/30 pl-1 ml-1 text-[8px]">
                    {[0.25, 0.5, 1, 2].map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() => {
                          soundSynth?.playUiClick?.();
                          setStampScale(sc);
                          showToast(`Stamp Scale: ${sc}x`);
                        }}
                        className={`px-1 py-0.5 rounded font-mono font-bold transition cursor-pointer ${
                          stampScale === sc
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'hover:bg-amber-500/30 text-amber-200'
                        }`}
                        title={`Scale stamp to ${sc}x (e.g. 800px area -> ${Math.round(800 * sc)}px scene)`}
                      >
                        {sc}x
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSlicerAutoPrefab}
                  className="px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow transition"
                  title="Save as reusable stamp"
                >
                  <Package className="w-3 h-3" />
                  <span>Save as Stamp</span>
                </button>

                <button
                  type="button"
                  onClick={handleSlicerQuickExtract}
                  className="px-2 py-1 rounded bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow transition"
                  title="Extract cropped tile directly into Tile Library"
                >
                  <Scissors className="w-3 h-3" />
                  <span>Extract to Library</span>
                </button>

                <button
                  type="button"
                  onClick={() => openExtractModal()}
                  className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow transition"
                  title="Open interactive grid calibration for this sheet"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Calibrate Grid</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSlicerSelection(null)}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                  title="Clear Selection"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* PIXEL CANVAS / PREVIEW */}
          {ts && !imgError ? (
            <div className="bg-black/90 rounded-xl border border-amber-500/30 overflow-auto max-h-[70vh] relative mt-1 custom-scrollbar">
              <div
                className="relative inline-block min-w-full"
                style={{
                  width: natural.w > 0 ? `${natural.w * zoomLevel}px` : '100%',
                  maxWidth: 'none',
                }}
              >
                <img 
                  ref={imgRef}
                  src={
                    ts.imageSource.startsWith('/') || ts.imageSource.startsWith('http')
                      ? ts.imageSource
                      : `/game-assets/tilesets/${ts.imageSource}`
                  }
                  alt={ts.imageSource}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onContextMenu={handleContextMenu}
                  onPointerLeave={() => {
                    if (!dragStart) {
                      setHoveredTile(null);
                    }
                  }}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  onLoad={(e) => {
                    const el = e.currentTarget;
                    const nw = el.naturalWidth;
                    const nh = el.naturalHeight;
                    setNatural({ w: nw, h: nh });
                    setImgError(false);
                    if (ts?.imageSource) {
                      TILESET_SIZES[ts.imageSource] = { w: nw, h: nh };
                      const base = ts.imageSource.split('/').pop() || '';
                      TILESET_SIZES[base] = { w: nw, h: nh };
                    }
                  }}
                  className={`${
                    isCalibratingOrigin
                      ? 'cursor-crosshair'
                      : selectionMode === 'slicer'
                      ? 'cursor-crosshair'
                      : 'cursor-pointer'
                  } w-full block select-none touch-none`}
                  style={{
                    imageRendering: 'pixelated',
                    minWidth: `${ts.columns * ts.tilewidth * zoomLevel}px`,
                  }}
                  onError={() => {
                    setImgError(true);
                  }}
                />

                {/* VISIBLE GRID LINE OVERLAY (Grid Mode) */}
                {showGridOverlay && selectionMode === 'grid' && natural.w > 0 && natural.h > 0 && (
                  <div
                    className="pointer-events-none absolute inset-0 z-10"
                    style={{
                      backgroundImage: `
                        linear-gradient(to right, rgba(255, 255, 255, 0.18) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255, 255, 255, 0.18) 1px, transparent 1px)
                      `,
                      backgroundPosition: `${((ts.offsetX ?? ts.margin ?? 0) * zoomLevel)}px ${((ts.offsetY ?? ts.margin ?? 0) * zoomLevel)}px`,
                      backgroundSize: `${((ts.tilewidth + (ts.spacing ?? 0)) * zoomLevel)}px ${((ts.tileheight + (ts.spacing ?? 0)) * zoomLevel)}px`,
                    }}
                  />
                )}

                {/* FREEFORM CROP SELECTION BOX */}
                {selectionMode === 'slicer' && slicerSelection && (
                  <div
                    className="pointer-events-none absolute border-2 border-fuchsia-400 bg-fuchsia-400/20 shadow-[0_0_20px_rgba(217,70,239,0.7)] z-30 transition-all duration-75"
                    style={{
                      left: `${(slicerSelection.x0 / natural.w) * 100}%`,
                      top: `${(slicerSelection.y0 / natural.h) * 100}%`,
                      width: `${((slicerSelection.x1 - slicerSelection.x0) / natural.w) * 100}%`,
                      height: `${((slicerSelection.y1 - slicerSelection.y0) / natural.h) * 100}%`,
                    }}
                  >
                    <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-white shadow-[0_0_8px_#d946ef]" />
                    <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-white shadow-[0_0_8px_#d946ef]" />
                    <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-white shadow-[0_0_8px_#d946ef]" />
                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-white shadow-[0_0_8px_#d946ef]" />

                    <div className="absolute -top-7 left-0 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/95 border border-fuchsia-400 text-[10px] font-bold text-fuchsia-300 shadow-2xl whitespace-nowrap z-40">
                      <Scissors className="w-3 h-3 text-fuchsia-400" />
                      <span>{slicerSelection.x1 - slicerSelection.x0} × {slicerSelection.y1 - slicerSelection.y0} px</span>
                    </div>
                  </div>
                )}

                {/* ACTIVE DRAGGING SELECTION BOX (Grid Mode) */}
                {selectionMode === 'grid' && hoveredTile && dragStart && (
                  <div
                    className="pointer-events-none absolute border border-amber-400 bg-amber-400/20 shadow-[0_0_16px_rgba(245,158,11,0.6)] z-30 transition-all duration-75"
                    style={{
                      left: `${hoveredTile.leftPct}%`,
                      top: `${hoveredTile.topPct}%`,
                      width: `${hoveredTile.widthPct}%`,
                      height: `${hoveredTile.heightPct}%`,
                    }}
                  >
                    <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-white shadow-[0_0_6px_#f59e0b]" />
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-white shadow-[0_0_6px_#f59e0b]" />
                    <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-white shadow-[0_0_6px_#f59e0b]" />
                    <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-white shadow-[0_0_6px_#f59e0b]" />

                    <div className="absolute -top-6 left-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/90 border border-amber-400/80 text-[9px] font-bold text-amber-300 shadow-xl whitespace-nowrap z-40">
                      <span>{hoveredTile.w} × {hoveredTile.h} Tiles</span>
                      <span className="text-slate-400 font-mono text-[8px]">({hoveredTile.w * ts.tilewidth}×{hoveredTile.h * ts.tileheight}px)</span>
                    </div>
                  </div>
                )}

                {/* COMMITTED SELECTION BOX (Grid Mode) */}
                {selectionMode === 'grid' && selection && !dragStart && (
                  <div
                    className="pointer-events-none absolute border border-cyan-400 bg-cyan-400/15 shadow-[0_0_14px_rgba(6,182,212,0.5)] z-20 transition-all duration-75"
                    style={{
                      left: `${selection.leftPct}%`,
                      top: `${selection.topPct}%`,
                      width: `${selection.widthPct}%`,
                      height: `${selection.heightPct}%`,
                    }}
                    title={`Selected tile ${selection.local}`}
                  >
                    <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-white shadow-[0_0_6px_#38bdf8]" />
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-white shadow-[0_0_6px_#38bdf8]" />
                    <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-white shadow-[0_0_6px_#38bdf8]" />
                    <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-white shadow-[0_0_6px_#38bdf8]" />

                    <div className="absolute -top-6 left-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/90 border border-cyan-400/80 text-[9px] font-bold text-cyan-300 shadow-xl whitespace-nowrap z-40">
                      <span>{selection.w} × {selection.h} Tiles</span>
                      <span className="text-slate-400 font-mono text-[8px]">({selection.w * ts.tilewidth}×{selection.h * ts.tileheight}px)</span>
                    </div>
                  </div>
                )}

                {/* HOVERED SINGLE TILE (IDLE) */}
                {selectionMode === 'grid' && hoveredTile && !dragStart && (
                  <div
                    className="pointer-events-none absolute border border-cyan-400/60 bg-cyan-400/10 z-10 transition-all duration-75"
                    style={{
                      left: `${hoveredTile.leftPct}%`,
                      top: `${hoveredTile.topPct}%`,
                      width: `${hoveredTile.widthPct}%`,
                      height: `${hoveredTile.heightPct}%`,
                    }}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-amber-500/20 bg-black/40 text-center gap-2 mt-1">
              <p className="text-xs text-amber-200/90 font-bold">
                {tilesets && tilesets.length > 0 ? 'Tileset Image Unavailable' : 'No Tilesets Installed'}
              </p>
              <p className="text-[10px] text-slate-400 leading-relaxed max-w-[220px]">
                {tilesets && tilesets.length > 0
                  ? `Could not load ${ts?.imageSource || 'image'}. Upload or install assets to paint visual tiles.`
                  : 'This realm currently has 0 tilesets. Install bundled assets or upload custom sheets from Asset Browser.'}
              </p>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="mt-1 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition cursor-pointer"
              >
                Browse & Add Tilesets
              </button>
            </div>
          )}

          {/* TILE DETAILS & SOURCE COORDINATES */}
          {ts && natural.w > 0 && (
            <div className="flex flex-col gap-1 px-2 py-1.5 bg-black/50 rounded-lg border border-slate-800 text-[9px] text-slate-400">
              <div className="flex items-center justify-between">
                <span>Source: {natural.w}×{natural.h}px ({ts.columns} columns)</span>
                <span>IDs {ts.firstgid}..{ts.firstgid + Math.floor(natural.h / ts.tileheight) * ts.columns - 1}</span>
              </div>
              {hoveredTile && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-amber-300">
                  <span>Region: X={hoveredTile.col * ts.tilewidth}, Y={hoveredTile.row * ts.tileheight} ({hoveredTile.w}×{hoveredTile.h} tiles)</span>
                  <button
                    type="button"
                    onClick={() => {
                      soundSynth?.playUiClick?.();
                      setPendingDef({
                        name: `Tile_${ts.imageSource.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'sheet'}_${hoveredTile.col}_${hoveredTile.row}`,
                        sourceSheet: ts.imageSource,
                        sourceX: hoveredTile.col * ts.tilewidth,
                        sourceY: hoveredTile.row * ts.tileheight,
                        sourceWidth: hoveredTile.w * ts.tilewidth,
                        sourceHeight: hoveredTile.h * ts.tileheight,
                        gid: hoveredTile.gid,
                        collision: 'NONE',
                        gameplayFlags: ['walkable'],
                        material: 'GRASS',
                        tags: ['tile', 'world-art'],
                      });
                      setIsSaveDefModalOpen(true);
                    }}
                    className="text-[9px] font-bold text-amber-400 hover:text-amber-200 underline cursor-pointer flex items-center gap-1"
                  >
                    <Save className="w-2.5 h-2.5" />
                    <span>Save Tile to Library</span>
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* ACTIVE BRUSH FOOTER */}
          <div className="flex justify-between items-center text-[10px] text-amber-200 bg-[#0b1320] border border-amber-500/20 p-2 rounded-lg">
            <span className="font-bold">Active Tile ID:</span>
            <div className="flex items-center gap-2">
              {hoveredTile && !imgError && (
                <span className="text-[10px] text-cyan-400 font-bold">Hover: ID {hoveredTile.gid}</span>
              )}
              <span className="font-bold text-white bg-amber-600 px-2 py-0.5 rounded shadow border border-amber-400/50 [text-shadow:_0_1px_2px_rgb(0_0_0)]">{activeBrushTileId}</span>
            </div>
          </div>
        </>
      ) : (
        /* ─── TILE LIBRARY VIEW ─── */
        <div className="flex flex-col gap-2.5">
          {/* SEARCH & CATEGORY CHIPS */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tiles by name, sheet, tag..."
              value={libraryFilter}
              onChange={(e) => setLibraryFilter(e.target.value)}
              className="w-full bg-[#050b14] border border-amber-500/30 rounded-lg pl-8 pr-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            />
            {libraryFilter && (
              <button
                type="button"
                onClick={() => setLibraryFilter('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[9px]">
            {['ALL', 'terrain', 'nature', 'structures', 'grass', 'water', 'path', 'wall', 'solid'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  soundSynth?.playUiClick?.();
                  setLibraryTagFilter(tag);
                }}
                className={`px-2.5 py-0.5 rounded-full border transition-all shrink-0 cursor-pointer font-bold ${
                  libraryTagFilter.toLowerCase() === tag.toLowerCase()
                    ? 'bg-amber-600 text-white border-amber-400 shadow-sm'
                    : 'bg-black/40 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {tag.toUpperCase()}
              </button>
            ))}
          </div>

          {/* ─── SELECTED TILE LIVE PREVIEW INSPECTOR BANNER ─── */}
          {selectedDef && (
            <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-[#091120] border border-amber-500/40 shadow-lg relative overflow-hidden">
              <div className="flex items-start gap-3">
                {/* Visual Cropped Thumbnail (Zoomed) */}
                <div className="relative group shrink-0">
                  <TileVisualThumbnail
                    sourceSheet={selectedDef.sourceSheet}
                    sourceX={selectedDef.sourceX}
                    sourceY={selectedDef.sourceY}
                    sourceWidth={selectedDef.sourceWidth}
                    sourceHeight={selectedDef.sourceHeight}
                    size={64}
                    className="border-2 border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.3)] group-hover:border-amber-300 transition-all"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-black/90 border border-amber-400/60 rounded px-1 text-[8px] font-bold text-amber-300 font-mono">
                    {selectedDef.sourceWidth}×{selectedDef.sourceHeight}
                  </div>
                </div>

                {/* Info and Properties */}
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs text-amber-300 truncate" title={selectedDef.name}>
                      {selectedDef.name}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteTileDefinition(selectedDef.id, e)}
                      className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition cursor-pointer"
                      title="Delete tile from library"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[9px]">
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                        selectedDef.collision === 'SOLID'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : selectedDef.collision === 'WATER'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : selectedDef.collision === 'LEDGE'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {selectedDef.collision}
                    </span>

                    <span className="px-1.5 py-0.2 rounded bg-black/60 border border-slate-700 text-slate-300 uppercase font-bold">
                      {selectedDef.material || 'GRASS'}
                    </span>

                    <span className="text-[9px] text-slate-400 truncate">
                      Sheet: {selectedDef.sourceSheet.split('/').pop()}
                    </span>
                  </div>

                  {selectedDef.tags && selectedDef.tags.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap text-[8px] text-slate-400">
                      <Tag className="w-2.5 h-2.5 text-amber-400" />
                      {selectedDef.tags.slice(0, 4).map((t, idx) => (
                        <span key={idx} className="bg-white/5 px-1 py-0.2 rounded">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions for Selected Tile */}
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-800 text-[10px]">
                <button
                  type="button"
                  onClick={() => handleSelectTileDefinition(selectedDef)}
                  className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold shadow transition cursor-pointer"
                >
                  <Brush className="w-3 h-3" />
                  <span>Use Brush</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundSynth?.playActionSound?.();
                    onFillLayer?.(activeLayerIdx, selectedDef.gid);
                    showToast(`Filled Layer ${activeLayerIdx} with ${selectedDef.name}`);
                  }}
                  className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold transition cursor-pointer"
                  title="Fill Active Layer"
                >
                  <PaintBucket className="w-3 h-3" />
                  <span>Fill Layer</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundSynth?.playActionSound?.();
                    onSetDefaultGroundGid?.(selectedDef.gid);
                    showToast(`Set as Ground: ${selectedDef.name}`);
                  }}
                  className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 font-bold transition cursor-pointer"
                  title="Set as Default Ground GID"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Set Ground</span>
                </button>
              </div>
            </div>
          )}

          {/* ─── TILE DEFINITIONS GRID ─── */}
          <div className="grid grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
            {tileDefinitions
              .filter((def) => {
                if (libraryFilter && !def.name.toLowerCase().includes(libraryFilter.toLowerCase()) && !def.sourceSheet.toLowerCase().includes(libraryFilter.toLowerCase())) {
                  return false;
                }
                if (
                  libraryTagFilter !== 'ALL' &&
                  !def.tags.some((t) => t.toLowerCase() === libraryTagFilter.toLowerCase()) &&
                  def.collision.toLowerCase() !== libraryTagFilter.toLowerCase() &&
                  def.material.toLowerCase() !== libraryTagFilter.toLowerCase()
                ) {
                  return false;
                }
                return true;
              })
              .map((def) => {
                const isSelected = (selectedTileDefId === def.id) || (!selectedTileDefId && selectedDef?.id === def.id);
                return (
                  <div
                    key={def.id}
                    onClick={() => handleSelectTileDefinition(def)}
                    className={`group p-2 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 relative overflow-hidden ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 shadow-md ring-1 ring-amber-400'
                        : 'bg-[#08101d] border-slate-800 hover:border-amber-500/40 hover:bg-[#0b1626] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <TileVisualThumbnail
                        sourceSheet={def.sourceSheet}
                        sourceX={def.sourceX}
                        sourceY={def.sourceY}
                        sourceWidth={def.sourceWidth}
                        sourceHeight={def.sourceHeight}
                        size={40}
                        className={isSelected ? 'border-amber-400' : 'border-slate-700'}
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-bold text-[10px] truncate text-amber-200 group-hover:text-amber-300" title={def.name}>
                          {def.name}
                        </span>
                        <span className="text-[8px] text-slate-400 truncate">
                          {def.sourceWidth}×{def.sourceHeight}px • {def.material}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span
                            className={`px-1 py-0.2 rounded text-[7px] font-bold ${
                              def.collision === 'SOLID'
                                ? 'bg-rose-500/20 text-rose-300'
                                : def.collision === 'WATER'
                                ? 'bg-cyan-500/20 text-cyan-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {def.collision}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* EMPTY STATE & GENERATOR TOOLBAR */}
          {tileDefinitions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-800 bg-black/40 text-center gap-2">
              <BookOpen className="w-6 h-6 text-amber-400/60" />
              <p className="text-xs text-slate-300 font-bold">Tile Library is Empty</p>
              <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
                Load starter terrain presets or extract tiles from your active tileset sheet.
              </p>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={handleLoadStarterPresets}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs shadow hover:bg-amber-500 cursor-pointer"
                >
                  Load Starter Presets
                </button>
                <button
                  type="button"
                  onClick={handleExtractTilesFromActiveSheet}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-amber-300 cursor-pointer"
                >
                  Extract From Sheet
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px] text-slate-400">
              <span>{tileDefinitions.length} Saved Tiles</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleLoadStarterPresets}
                  className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                  title="Add standard starter presets to library"
                >
                  + Presets
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={handleExtractTilesFromActiveSheet}
                  className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                  title="Auto-extract top tiles from active tileset sheet"
                >
                  + Extract Sheet
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADD TILESET FROM ASSET CATALOG MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-2xl border border-purple-500/40 bg-[#050b14] p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <span>Add Tileset to Active Map</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search tileset assets..."
                value={assetSearchQuery}
                onChange={(e) => setAssetSearchQuery(e.target.value)}
                className="w-full bg-[#0b1320] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-[350px] pr-1 custom-scrollbar">
              {loadingAssets ? (
                <div className="text-center py-8 text-xs text-slate-500">Searching assets...</div>
              ) : availableTilesetAssets.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 space-y-2">
                  <p>No tileset assets match your search.</p>
                  <p className="text-[10px] text-slate-500">Upload new tilesets in Asset Manager.</p>
                </div>
              ) : (
                availableTilesetAssets.map((asset) => {
                  const filename = asset.source.split('/').pop() || asset.id;
                  const isAlreadyAdded = tilesets.some((t) => t.imageSource.toLowerCase().includes(filename.toLowerCase()));
                  return (
                    <div
                      key={asset.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                        isAlreadyAdded
                          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                          : 'bg-[#0b1320] border-slate-800 hover:border-amber-500/40 hover:bg-black/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-black/60 border border-slate-800 flex items-center justify-center p-1 shrink-0">
                          <img
                            src={asset.source}
                            alt=""
                            className="max-w-full max-h-full object-contain"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-white truncate">{filename}</span>
                          <span className="text-[10px] text-slate-400 truncate">{asset.source}</span>
                        </div>
                      </div>

                      <div>
                        {isAlreadyAdded ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/40 flex items-center gap-1">
                            <Check className="w-3 h-3" /> In Map
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddTilesetFromSource(asset.source)}
                            className="text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white px-3 py-1.5 rounded-lg shadow transition cursor-pointer"
                          >
                            + Add to Map
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              <span>{availableTilesetAssets.length} tilesets available</span>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1 text-xs text-slate-300 hover:text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TILESET SETTINGS MODAL */}
      {isSettingsModalOpen && ts && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-2xl border border-amber-500/40 bg-[#050b14] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <Settings className="w-4 h-4 text-amber-400" />
                <span>Tileset Settings</span>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-2 font-bold uppercase text-[10px]">Tile Size Presets</label>
                <div className="grid grid-cols-4 gap-2">
                  {[16, 32, 64, 128].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        soundSynth?.playUiClick?.();
                        handleUpdateTilesetSettings({ tilewidth: size, tileheight: size });
                        showToast(`Tile size set to ${size}×${size}px`);
                      }}
                      className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        ts.tilewidth === size && ts.tileheight === size
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-black/60 border border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {size}px
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <label className="block text-slate-400 mb-2 font-bold uppercase text-[10px]">Custom Tile Dimensions</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <span className="text-[9px] text-slate-500 uppercase mb-1 block">Width</span>
                    <input
                      type="number"
                      min="1"
                      value={ts.tilewidth}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 16;
                        handleUpdateTilesetSettings({ tilewidth: val });
                      }}
                      className="w-full bg-black/60 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <span className="text-slate-500 mt-4">x</span>
                  <div className="flex-1">
                    <span className="text-[9px] text-slate-500 uppercase mb-1 block">Height</span>
                    <input
                      type="number"
                      min="1"
                      value={ts.tileheight}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 16;
                        handleUpdateTilesetSettings({ tileheight: val });
                      }}
                      className="w-full bg-black/60 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <label className="block text-slate-400 mb-1 font-bold uppercase text-[10px]">Columns</label>
                <input
                  type="number"
                  min="1"
                  value={ts.columns}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    handleUpdateTilesetSettings({ columns: val });
                  }}
                  className="w-full bg-black/60 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Adjusting width auto-calculates columns, but you can override it if the image has margins.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TILE RIGHT-CLICK CONTEXT MENU */}
      {tileContextMenu && (
        <div
          className="fixed z-[9999] bg-[#0c1424] border border-amber-500/40 rounded-xl shadow-2xl p-2 flex flex-col gap-1 min-w-[240px] text-xs font-mono text-slate-200 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          style={{ left: tileContextMenu.x, top: tileContextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2.5 p-2 bg-black/60 rounded-lg border border-amber-500/20 mb-1">
            {tileContextMenu.dataUrl ? (
              <img
                src={tileContextMenu.dataUrl}
                alt="Tile"
                className="w-9 h-9 border border-amber-400/40 bg-black/80 rounded object-contain shrink-0"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <div className="w-9 h-9 border border-amber-400/40 bg-black/80 rounded flex items-center justify-center text-amber-400 font-bold text-xs">
                #{tileContextMenu.gid}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-amber-300 font-bold text-xs">Tile ID #{tileContextMenu.gid}</span>
              <span className="text-[10px] text-slate-400 truncate">
                Tile #{tileContextMenu.localId} ({tileContextMenu.ts.tilewidth}×{tileContextMenu.ts.tileheight}px)
              </span>
              <span className="text-[9px] text-slate-500 truncate">
                Row {tileContextMenu.row}, Col {tileContextMenu.col}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundSynth?.playSelectSound?.();
              onBrushSelect(tileContextMenu.gid);
              setTileContextMenu(null);
              showToast(`Selected Tile ID #${tileContextMenu.gid} as Brush`);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-500/20 text-slate-200 hover:text-amber-200 text-left transition cursor-pointer"
          >
            <Brush className="w-3.5 h-3.5 text-amber-400" />
            <span>Select as Active Brush</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundSynth?.playActionSound?.();
              if (onFillLayer) {
                onFillLayer(activeLayerIdx, tileContextMenu.gid);
              }
              setTileContextMenu(null);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-500/20 text-slate-200 hover:text-amber-200 text-left transition cursor-pointer"
          >
            <PaintBucket className="w-3.5 h-3.5 text-amber-400" />
            <span>Fill Active Layer (Layer {activeLayerIdx})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundSynth?.playActionSound?.();
              if (onFillLayer) {
                onFillLayer(0, tileContextMenu.gid);
              }
              setTileContextMenu(null);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-500/20 text-slate-200 hover:text-amber-200 text-left transition cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Fill Ground Layer (Layer 0)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundSynth?.playUiClick?.();
              setPendingDef({
                name: `Tile_${tileContextMenu.ts.imageSource.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'sheet'}_${tileContextMenu.col}_${tileContextMenu.row}`,
                sourceSheet: tileContextMenu.ts.imageSource,
                sourceX: tileContextMenu.col * tileContextMenu.ts.tilewidth,
                sourceY: tileContextMenu.row * tileContextMenu.ts.tileheight,
                sourceWidth: (tileContextMenu.w || 1) * tileContextMenu.ts.tilewidth,
                sourceHeight: (tileContextMenu.h || 1) * tileContextMenu.ts.tileheight,
                gid: tileContextMenu.gid,
                collision: 'NONE',
                gameplayFlags: ['walkable'],
                material: 'GRASS',
                tags: ['tile', 'world-art'],
              });
              setIsSaveDefModalOpen(true);
              setTileContextMenu(null);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-500/20 text-slate-200 hover:text-amber-200 text-left transition cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Save Tile to Library</span>
          </button>

          {tileContextMenu.dataUrl && (
            <button
              type="button"
              onClick={() => {
                soundSynth?.playUiClick?.();
                const a = document.createElement('a');
                a.href = tileContextMenu.dataUrl!;
                const name =
                  tileContextMenu.ts.imageSource.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'tileset';
                a.download = `${name}_tile_${tileContextMenu.localId}_gid${tileContextMenu.gid}.png`;
                a.click();
                showToast(
                  `Exported tile as PNG (${tileContextMenu.ts.tilewidth}×${tileContextMenu.ts.tileheight}px)`
                );
                setTileContextMenu(null);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-500/20 text-slate-200 hover:text-amber-200 text-left transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export as PNG</span>
            </button>
          )}

          {onSetDefaultGroundGid && (
            <button
              type="button"
              onClick={() => {
                soundSynth?.playActionSound?.();
                onSetDefaultGroundGid(tileContextMenu.gid);
                showToast(`Set ID #${tileContextMenu.gid} as Default Ground`);
                setTileContextMenu(null);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-500/20 text-slate-200 hover:text-amber-200 text-left transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Set as Default Ground</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundSynth?.playUiClick?.();
              navigator.clipboard.writeText(String(tileContextMenu.gid));
              showToast(`Copied Tile ID #${tileContextMenu.gid} to clipboard`);
              setTileContextMenu(null);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-500/20 text-slate-200 hover:text-amber-200 text-left transition cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>Copy Tile ID</span>
          </button>

          {activeLayerIdx === -1 && (
            <div className="pt-1 mt-1 border-t border-slate-800 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => {
                  soundSynth?.playActionSound?.();
                  window.dispatchEvent(
                    new CustomEvent('studio_set_tile_logic', {
                      detail: { gid: tileContextMenu.gid, isSolid: true },
                    })
                  );
                  showToast(`Marked Tile ID #${tileContextMenu.gid} as Solid`);
                  setTileContextMenu(null);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/20 text-slate-200 hover:text-rose-300 text-left transition cursor-pointer text-[11px]"
              >
                <Shield className="w-3.5 h-3.5 text-rose-400" />
                <span>Make Solid (Blocking)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundSynth?.playActionSound?.();
                  window.dispatchEvent(
                    new CustomEvent('studio_set_tile_logic', {
                      detail: { gid: tileContextMenu.gid, isWater: true },
                    })
                  );
                  showToast(`Marked Tile ID #${tileContextMenu.gid} as Water`);
                  setTileContextMenu(null);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-sky-500/20 text-slate-200 hover:text-sky-300 text-left transition cursor-pointer text-[11px]"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Make Swimmable Water</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SAVE TILE DEFINITION MODAL */}
      {isSaveDefModalOpen && pendingDef && (
        <div className="fixed inset-0 z-[450] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-[#050b14] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Save Tile to Library</span>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveDefModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              {/* Visual Thumbnail & Source Info */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/60 border border-amber-500/30">
                {pendingDef.sourceSheet && (
                  <TileVisualThumbnail
                    sourceSheet={pendingDef.sourceSheet}
                    sourceX={pendingDef.sourceX || 0}
                    sourceY={pendingDef.sourceY || 0}
                    sourceWidth={pendingDef.sourceWidth || 16}
                    sourceHeight={pendingDef.sourceHeight || 16}
                    size={56}
                    className="border border-amber-400/60 shadow"
                  />
                )}
                <div className="flex flex-col min-w-0 text-[10px]">
                  <span className="text-amber-300 font-bold truncate">
                    Sheet: {pendingDef.sourceSheet?.split('/').pop()}
                  </span>
                  <span className="text-slate-400">
                    Area: X:{pendingDef.sourceX} Y:{pendingDef.sourceY} ({pendingDef.sourceWidth}×{pendingDef.sourceHeight}px)
                  </span>
                  <span className="text-slate-500 text-[9px]">
                    GID #{pendingDef.gid || 1}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 text-[10px] uppercase font-bold">Tile Name</label>
                <input
                  type="text"
                  value={pendingDef.name || ''}
                  onChange={(e) => setPendingDef({ ...pendingDef, name: e.target.value })}
                  placeholder="e.g. Forest Grass Tile"
                  className="w-full bg-black/60 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 text-[10px] uppercase font-bold">Collision Type</label>
                  <select
                    value={pendingDef.collision || 'NONE'}
                    onChange={(e) => setPendingDef({ ...pendingDef, collision: e.target.value as any })}
                    className="w-full bg-black/60 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="NONE">Passable (Walk Through)</option>
                    <option value="SOLID">Solid (Blocking)</option>
                    <option value="WATER">Water (Swimmable)</option>
                    <option value="LEDGE">Ledge (Jump Down)</option>
                    <option value="CLIFF">Cliff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 text-[10px] uppercase font-bold">Material</label>
                  <select
                    value={pendingDef.material || 'GRASS'}
                    onChange={(e) => setPendingDef({ ...pendingDef, material: e.target.value })}
                    className="w-full bg-black/60 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="GRASS">Grass</option>
                    <option value="STONE">Stone</option>
                    <option value="WOOD">Wood</option>
                    <option value="WATER">Water</option>
                    <option value="DIRT">Dirt</option>
                    <option value="SAND">Sand</option>
                    <option value="METAL">Metal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 text-[10px] uppercase font-bold">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={pendingDef.tags?.join(', ') || ''}
                  onChange={(e) =>
                    setPendingDef({
                      ...pendingDef,
                      tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                    })
                  }
                  placeholder="tile, world-art, forest, outdoor"
                  className="w-full bg-black/60 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsSaveDefModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveAsTileDefinition(pendingDef)}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition cursor-pointer text-xs"
              >
                Save to Tile Library
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TILESHEET GRID CALIBRATION & EXTRACTION WIZARD MODAL ─── */}
      {isExtractModalOpen && ts && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border border-amber-500/40 bg-[#050b14] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden font-mono text-xs text-slate-200">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-amber-500/30 bg-[#08101e]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400">
                  <Scissors className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-amber-200 flex items-center gap-2">
                    <span>Tilesheet Calibration & Extraction Wizard</span>
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Interactive Grid Studio
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Align grid boundaries, calibrate tile dimensions, and extract sprites directly into your Tile Library.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-400 bg-black/50 px-2.5 py-1 rounded-md border border-slate-800 font-mono truncate max-w-[200px]" title={ts.imageSource}>
                  {ts.imageSource.split('/').pop()}
                </span>
                <button
                  type="button"
                  onClick={() => setIsExtractModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* MODAL BODY (SPLIT CONTROLS & LIVE VISUAL CANVAS) */}
            <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
              {/* LEFT SIDEBAR: CONTROLS & SMART SUGGESTION */}
              <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-800/80 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4 bg-[#070e1a]/95 shrink-0">
                {/* SMART SUGGESTION CARD */}
                {(() => {
                  const nw = natural.w || ts.imagewidth || 512;
                  const nh = natural.h || ts.imageheight || 512;
                  const suggestion = suggestGridForImage(nw, nh);
                  return (
                    <div className="p-3 rounded-xl bg-gradient-to-br from-amber-950/40 to-black border border-amber-500/40 flex flex-col gap-2 shadow">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          Smart Suggestion
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200">
                          {suggestion.size}×{suggestion.size}px
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 leading-relaxed">
                        {suggestion.reason}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          soundSynth?.playActionSound?.();
                          setExtractTileWidth(suggestion.size);
                          setExtractTileHeight(suggestion.size);
                          showToast(`Applied suggested ${suggestion.size}×${suggestion.size}px grid`);
                        }}
                        className="mt-1 w-full py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Apply Suggestion ({suggestion.size}×{suggestion.size})</span>
                      </button>
                    </div>
                  );
                })()}

                {/* QUICK PRESET PILLS */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                    Grid Size Presets
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[16, 24, 32, 48, 64, 128].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          soundSynth?.playUiClick?.();
                          setExtractTileWidth(sz);
                          setExtractTileHeight(sz);
                        }}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${
                          extractTileWidth === sz && extractTileHeight === sz
                            ? 'bg-amber-600 text-white border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                            : 'bg-black/40 text-slate-300 hover:bg-white/5 border-slate-700/60'
                        }`}
                      >
                        {sz}×{sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* FINE-TUNING DIMENSIONS */}
                <div className="flex flex-col gap-2.5 bg-black/40 p-3 rounded-xl border border-slate-800">
                  <label className="text-[10px] font-bold text-amber-400/90 uppercase tracking-wider flex items-center justify-between">
                    <span>Fine Tuning</span>
                    <Sliders className="w-3 h-3 text-amber-400" />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-0.5">Tile Width (px)</label>
                      <input
                        type="number"
                        min="4"
                        max="512"
                        value={extractTileWidth}
                        onChange={(e) => setExtractTileWidth(Math.max(4, parseInt(e.target.value) || 16))}
                        className="w-full bg-[#050b14] border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-0.5">Tile Height (px)</label>
                      <input
                        type="number"
                        min="4"
                        max="512"
                        value={extractTileHeight}
                        onChange={(e) => setExtractTileHeight(Math.max(4, parseInt(e.target.value) || 16))}
                        className="w-full bg-[#050b14] border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-0.5">Offset X (px)</label>
                      <input
                        type="number"
                        min="0"
                        max="512"
                        value={extractOffsetX}
                        onChange={(e) => setExtractOffsetX(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-[#050b14] border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-0.5">Offset Y (px)</label>
                      <input
                        type="number"
                        min="0"
                        max="512"
                        value={extractOffsetY}
                        onChange={(e) => setExtractOffsetY(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-[#050b14] border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-400 block mb-0.5">Spacing / Margin (px)</label>
                    <input
                      type="number"
                      min="0"
                      max="64"
                      value={extractSpacing}
                      onChange={(e) => setExtractSpacing(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-[#050b14] border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  {/* Interactive Origin Picker Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      soundSynth?.playUiClick?.();
                      setExtractOriginPicking((prev) => !prev);
                      if (!extractOriginPicking) {
                        showToast('Click top-left corner of any tile on the preview sheet to align origin.');
                      }
                    }}
                    className={`w-full py-1.5 px-2 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                      extractOriginPicking
                        ? 'bg-rose-600 text-white border-rose-400 animate-pulse shadow-[0_0_15px_rgba(225,29,72,0.6)]'
                        : 'bg-white/5 hover:bg-white/10 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>{extractOriginPicking ? 'Click Canvas to Set Origin' : 'Pick Origin on Image'}</span>
                  </button>
                </div>

                {/* CALCULATED STATS */}
                {(() => {
                  const nw = natural.w || ts.imagewidth || 512;
                  const nh = natural.h || ts.imageheight || 512;
                  const cols = Math.max(1, Math.floor((nw - extractOffsetX) / (extractTileWidth + extractSpacing)));
                  const rows = Math.max(1, Math.floor((nh - extractOffsetY) / (extractTileHeight + extractSpacing)));
                  const total = cols * rows;
                  return (
                    <div className="flex flex-col gap-1 px-3 py-2 bg-black/60 rounded-xl border border-slate-800 text-[10px]">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Image Size:</span>
                        <span className="text-white font-bold">{nw} × {nh} px</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Calculated Grid:</span>
                        <span className="text-amber-300 font-bold">{cols} cols × {rows} rows</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800">
                        <span>Total Sliced Tiles:</span>
                        <span className="text-emerald-400 font-bold">{total} tiles</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* RIGHT CANVAS: LIVE INTERACTIVE PREVIEW WITH OVERLAY GRID */}
              <div className="flex-1 min-w-0 bg-black flex flex-col overflow-hidden relative">
                {/* ZOOM & VIEW CONTROLS */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#08101e] border-b border-slate-800 text-[10px] shrink-0">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Grid className="w-3.5 h-3.5 text-amber-400" />
                    Live Calibrated Preview
                  </span>
                  <div className="flex items-center gap-1">
                    {[0.5, 1, 2, 3].map((z) => (
                      <button
                        key={z}
                        type="button"
                        onClick={() => setExtractZoom(z)}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer transition ${
                          extractZoom === z
                            ? 'bg-amber-600 text-white font-bold'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {z}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* SCROLLABLE IMAGE CANVAS WITH GRID */}
                <div className="flex-1 overflow-auto p-4 custom-scrollbar relative flex items-center justify-center bg-[#02060d]">
                  <div
                    className="relative inline-block border border-amber-500/40 rounded shadow-2xl overflow-hidden"
                    style={{
                      width: natural.w > 0 ? `${natural.w * extractZoom}px` : 'auto',
                      height: natural.h > 0 ? `${natural.h * extractZoom}px` : 'auto',
                      imageRendering: 'pixelated',
                      cursor: extractOriginPicking ? 'crosshair' : 'default',
                    }}
                    onClick={(e) => {
                      if (!extractOriginPicking) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = (e.clientX - rect.left) / extractZoom;
                      const y = (e.clientY - rect.top) / extractZoom;
                      setExtractOffsetX(Math.max(0, Math.floor(x)));
                      setExtractOffsetY(Math.max(0, Math.floor(y)));
                      setExtractOriginPicking(false);
                      showToast(`Origin set to X:${Math.floor(x)}px, Y:${Math.floor(y)}px`);
                      soundSynth?.playSelectSound?.();
                    }}
                  >
                    <img
                      src={
                        ts.imageSource.startsWith('/') || ts.imageSource.startsWith('http')
                          ? ts.imageSource
                          : `/game-assets/tilesets/${ts.imageSource}`
                      }
                      alt={ts.imageSource}
                      className="block select-none pointer-events-none"
                      style={{
                        width: `${(natural.w || 512) * extractZoom}px`,
                        height: `${(natural.h || 512) * extractZoom}px`,
                        imageRendering: 'pixelated',
                      }}
                      draggable={false}
                    />

                    {/* DYNAMIC CALIBRATED GRID OVERLAY */}
                    <div
                      className="pointer-events-none absolute inset-0 z-10"
                      style={{
                        backgroundImage: `
                          linear-gradient(to right, rgba(245, 158, 11, 0.45) 1px, transparent 1px),
                          linear-gradient(to bottom, rgba(245, 158, 11, 0.45) 1px, transparent 1px)
                        `,
                        backgroundPosition: `${extractOffsetX * extractZoom}px ${extractOffsetY * extractZoom}px`,
                        backgroundSize: `${(extractTileWidth + extractSpacing) * extractZoom}px ${(extractTileHeight + extractSpacing) * extractZoom}px`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* MODAL FOOTER ACTIONS */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-amber-500/30 bg-[#08101e]">
              <span className="text-[10px] text-slate-400 italic">
                Tip: Extracting saves all tiles into your persistent Tile Library for 1-click painting.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExtractModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyExtractedGrid(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-200 font-bold text-xs border border-amber-500/30 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Grid className="w-3.5 h-3.5 text-amber-400" />
                  <span>Calibrate Sheet Grid Only</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyExtractedGrid(true)}
                  className="px-5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-white font-bold text-xs shadow-[0_0_20px_rgba(245,158,11,0.5)] transition cursor-pointer flex items-center gap-1.5"
                >
                  <Scissors className="w-3.5 h-3.5 text-white" />
                  <span>Extract All Tiles to Library</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
