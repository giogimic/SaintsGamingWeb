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
} from 'lucide-react';
import { AssetManager, type GameAssetItem } from '@/engine/assets/AssetManager';
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

interface TilesetPickerProps {
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
  const [activeTab, setActiveTab] = useState<'palette' | 'library'>('palette');
  const [activeTsIdx, setActiveTsIdx] = useState(0);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [imgError, setImgError] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [dragStart, setDragStart] = useState<{ r: number; c: number } | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{ leftPct: number; topPct: number; widthPct: number; heightPct: number; gid: number; col: number; row: number; w: number; h: number } | null>(null);
  const [tilesetSearch, setTilesetSearch] = useState('');
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

  // Tile Library state
  const [tileDefinitions, setTileDefinitions] = useState<TileDefinition[]>([]);
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

  // Load canonical tile definitions from AssetManager
  const loadTileLibrary = useCallback(async () => {
    try {
      const manager = AssetManager.getInstance();
      const res = await manager.searchAssets({ type: 'TILE' }, 0, 100);
      if (res?.items) {
        const defs: TileDefinition[] = res.items.map((item) => {
          let region = { x: 0, y: 0, w: 16, h: 16 };
          if (item.metadata?.sourceRegion) {
            region = typeof item.metadata.sourceRegion === 'string'
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
        setTileDefinitions(defs);
      }
    } catch (e) {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    void loadTileLibrary();
  }, [loadTileLibrary]);


  // Auto-select tileset tab if activeBrushTileId changes (e.g. via Eyedropper or on mount)
  useEffect(() => {
    if (!tilesets || tilesets.length === 0 || activeBrushTileId <= 0) return;
    for (let i = tilesets.length - 1; i >= 0; i--) {
      if (activeBrushTileId >= tilesets[i].firstgid) {
        if (activeTsIdx !== i) {
          setActiveTsIdx(i);
          setNatural({ w: 0, h: 0 });
          setHoveredTile(null);
          setImgError(false);
        }
        break;
      }
    }
  }, [activeBrushTileId, tilesets]);

  // Listen for studio_add_tileset event from Asset Browser or other panels
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

    // Check if already in active tilesets
    const existingIdx = tilesets.findIndex((t) => t.imageSource.toLowerCase().includes(normalized.toLowerCase()));
    if (existingIdx !== -1) {
      setActiveTsIdx(existingIdx);
      setIsAddModalOpen(false);
      return;
    }

    // Calculate firstgid
    let nextFirstGid = 1;
    if (tilesets.length > 0) {
      const last = tilesets[tilesets.length - 1];
      const estimatedCount = 65536;
      nextFirstGid = last.firstgid + estimatedCount;
    }

    const imgUrl = normalized.startsWith('/') || normalized.startsWith('http') 
        ? normalized 
        : `/game-assets/tilesets/${normalized}`;

    const img = new Image();
    img.onload = () => {
      // Default to 16px standard tile unit for RPG maps so granular 1-block selection works seamlessly
      const tilewidth = 16;
      const tileheight = 16;
      const columns = Math.max(1, Math.floor(img.width / tilewidth));

      const newTileset: TilesetMeta = {
        firstgid: nextFirstGid,
        imageSource: normalized,
        columns,
        tilewidth,
        tileheight,
        imagewidth: img.width,
        imageheight: img.height,
      };

      const updated = [...tilesets, newTileset];
      onUpdateTilesets?.(updated);
      setActiveTsIdx(updated.length - 1);
      setNatural({ w: 0, h: 0 });
      setImgError(false);
      setIsAddModalOpen(false);
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

  const handleUpdateTilesetSettings = (meta: Partial<TilesetMeta>) => {
    if (!tilesets || activeTsIdx < 0 || activeTsIdx >= tilesets.length) return;
    const updated = [...tilesets];
    updated[activeTsIdx] = { ...updated[activeTsIdx], ...meta };
    onUpdateTilesets?.(updated);
  };

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
    if (!ts || imgError || !natural.w || !natural.h) return null;
    const local = activeBrushTileId - ts.firstgid;
    if (local < 0) return null;
    const maxLocal = Math.floor(natural.h / ts.tileheight) * ts.columns;
    if (local >= maxLocal) return null;
    const col = local % ts.columns;
    const row = Math.floor(local / ts.columns);

    // If an active brush pattern is selected, render the multi-tile selection box
    const spanW = activeBrushPattern?.w || 1;
    const spanH = activeBrushPattern?.h || 1;

    return {
      leftPct: ((col * ts.tilewidth) / natural.w) * 100,
      topPct: ((row * ts.tileheight) / natural.h) * 100,
      widthPct: ((spanW * ts.tilewidth) / natural.w) * 100,
      heightPct: ((spanH * ts.tileheight) / natural.h) * 100,
      local,
      w: spanW,
      h: spanH,
    };
  }, [ts, activeBrushTileId, activeBrushPattern, natural, imgError]);

  const onBrushSelectRef = useRef(onBrushSelect);
  onBrushSelectRef.current = onBrushSelect;
  const onBrushSelectPatternRef = useRef(onBrushSelectPattern);
  onBrushSelectPatternRef.current = onBrushSelectPattern;

  const dragStartRef = useRef<{ r: number; c: number } | null>(null);
  const isPointerDownRef = useRef<boolean>(false);
  const lastSoundPlayRef = useRef<number>(0);

  const selectTileRegion = useCallback(
    (startRow: number, startCol: number, width: number, height: number) => {
      if (!ts || !natural.w || !natural.h) return;
      const maxRows = Math.floor(natural.h / ts.tileheight);
      const safeRow = Math.max(0, Math.min(startRow, maxRows - 1));
      const safeCol = Math.max(0, Math.min(startCol, ts.columns - 1));
      const endRow = Math.min(safeRow + height - 1, maxRows - 1);
      const endCol = Math.min(safeCol + width - 1, ts.columns - 1);
      const spanW = endCol - safeCol + 1;
      const spanH = endRow - safeRow + 1;

      const gids: number[][] = [];
      for (let r = safeRow; r <= endRow; r++) {
        const rowGids: number[] = [];
        for (let c = safeCol; c <= endCol; c++) {
          rowGids.push(ts.firstgid + r * ts.columns + c);
        }
        gids.push(rowGids);
      }

      const topGid = gids[0]?.[0] ?? (ts.firstgid + safeRow * ts.columns + safeCol);
      const now = Date.now();
      if (now - lastSoundPlayRef.current > 150) {
        lastSoundPlayRef.current = now;
        soundSynth?.playSelectSound?.();
      }
      onBrushSelectRef.current(topGid);
      if (onBrushSelectPatternRef.current) {
        if (spanW > 1 || spanH > 1) {
          onBrushSelectPatternRef.current({ w: spanW, h: spanH, gids });
        } else {
          onBrushSelectPatternRef.current(null);
        }
      }
    },
    [ts, natural]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    if (e.button !== 0) return; // Only primary left click
    if (!ts || imgError || !imgRef.current || !natural.w || !natural.h) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    isPointerDownRef.current = true;
    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width - 1, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height - 1, e.clientY - rect.top));
    const scaleX = imgRef.current.naturalWidth / rect.width;
    const scaleY = imgRef.current.naturalHeight / rect.height;
    const nativeX = Math.floor(x * scaleX);
    const nativeY = Math.floor(y * scaleY);
    const col = Math.min(ts.columns - 1, Math.max(0, Math.floor(nativeX / ts.tilewidth)));
    const row = Math.min(
      Math.floor(natural.h / ts.tileheight) - 1,
      Math.max(0, Math.floor(nativeY / ts.tileheight))
    );

    dragStartRef.current = { r: row, c: col };
    setDragStart({ r: row, c: col });

    const gid = ts.firstgid + row * ts.columns + col;
    setHoveredTile({
      leftPct: ((col * ts.tilewidth) / natural.w) * 100,
      topPct: ((row * ts.tileheight) / natural.h) * 100,
      widthPct: ((1 * ts.tilewidth) / natural.w) * 100,
      heightPct: ((1 * ts.tileheight) / natural.h) * 100,
      gid,
      col,
      row,
      w: 1,
      h: 1,
    });

    selectTileRegion(row, col, 1, 1);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!ts || imgError || !imgRef.current || !natural.w || !natural.h) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width - 1, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height - 1, e.clientY - rect.top));
    const scaleX = imgRef.current.naturalWidth / rect.width;
    const scaleY = imgRef.current.naturalHeight / rect.height;
    const nativeX = Math.floor(x * scaleX);
    const nativeY = Math.floor(y * scaleY);
    const col = Math.min(ts.columns - 1, Math.max(0, Math.floor(nativeX / ts.tilewidth)));
    const row = Math.min(
      Math.floor(natural.h / ts.tileheight) - 1,
      Math.max(0, Math.floor(nativeY / ts.tileheight))
    );

    const maxRows = Math.floor(natural.h / ts.tileheight);

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
    maxCol = Math.min(maxCol, ts.columns - 1);

    const spanW = maxCol - minCol + 1;
    const spanH = maxRow - minRow + 1;
    const gid = ts.firstgid + minRow * ts.columns + minCol;
    setHoveredTile({
      leftPct: ((minCol * ts.tilewidth) / natural.w) * 100,
      topPct: ((minRow * ts.tileheight) / natural.h) * 100,
      widthPct: ((spanW * ts.tilewidth) / natural.w) * 100,
      heightPct: ((spanH * ts.tileheight) / natural.h) * 100,
      gid,
      col: minCol,
      row: minRow,
      w: spanW,
      h: spanH,
    });

    if (start && isPointerDownRef.current) {
      selectTileRegion(minRow, minCol, spanW, spanH);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    const start = dragStartRef.current;
    if (start && ts && !imgError && imgRef.current && natural.w && natural.h) {
      const rect = imgRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width - 1, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height - 1, e.clientY - rect.top));
      const scaleX = imgRef.current.naturalWidth / rect.width;
      const scaleY = imgRef.current.naturalHeight / rect.height;
      const nativeX = Math.floor(x * scaleX);
      const nativeY = Math.floor(y * scaleY);
      const col = Math.min(ts.columns - 1, Math.max(0, Math.floor(nativeX / ts.tilewidth)));
      const row = Math.min(
        Math.floor(natural.h / ts.tileheight) - 1,
        Math.max(0, Math.floor(nativeY / ts.tileheight))
      );

      const minRow = Math.min(start.r, row);
      const maxRow = Math.max(start.r, row);
      const minCol = Math.min(start.c, col);
      const maxCol = Math.max(start.c, col);
      const spanW = maxCol - minCol + 1;
      const spanH = maxRow - minRow + 1;

      selectTileRegion(minRow, minCol, spanW, spanH);
    }

    dragStartRef.current = null;
    setDragStart(null);
  };

  // Keyboard navigation: step 1 block over with arrow keys
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
        const maxRows = Math.floor(natural.h / ts.tileheight);
        let col = local % ts.columns;
        let row = Math.floor(local / ts.columns);

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
    const scaleX = imgRef.current.naturalWidth / rect.width;
    const scaleY = imgRef.current.naturalHeight / rect.height;
    const nativeX = Math.floor(x * scaleX);
    const nativeY = Math.floor(y * scaleY);
    const col = Math.floor(nativeX / ts.tilewidth);
    const row = Math.floor(nativeY / ts.tileheight);

    if (col < 0 || row < 0 || col >= ts.columns || nativeY >= imgRef.current.naturalHeight) return;

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
          col * ts.tilewidth,
          row * ts.tileheight,
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
      /* cross-origin canvas fallback */
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
      showToast('Name and source sheet are required.');
      return;
    }
    try {
      const manager = AssetManager.getInstance();
      const result = await manager.registerAsset({
        type: 'TILE',
        source: def.sourceSheet,
        metadata: {
          originalName: def.name,
          sourceSheet: def.sourceSheet,
          sourceRegion: {
            x: def.sourceX || 0,
            y: def.sourceY || 0,
            w: def.sourceWidth || 16,
            h: def.sourceHeight || 16,
          },
          gid: def.gid,
          collision: def.collision || 'NONE',
          gameplayFlags: def.gameplayFlags || [],
          material: def.material || 'GRASS',
        },
        tags: def.tags || ['tile', 'world-art'],
      });

      if (result) {
        showToast(`Saved "${def.name}" to Tile Library.`);
        setIsSaveDefModalOpen(false);
        setPendingDef(null);
        void loadTileLibrary();
      }
    } catch (error) {
      showToast('Failed to save Tile Definition.');
    }
  };

  return (
    <div className="flex flex-col gap-2 font-mono select-none">
      {/* ─── PALETTE VS LIBRARY TAB SWITCHER ─── */}
      <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-amber-500/20">
        <button
          type="button"
          onClick={() => {
            soundSynth?.playUiClick?.();
            setActiveTab('palette');
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-bold transition cursor-pointer ${
            activeTab === 'palette'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
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
              ? 'bg-amber-500 text-slate-950 shadow-sm'
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
            Left-click or drag on the sheet to select brush. <span className="text-amber-300 font-bold">Right-click any tile</span> for layer fill, Tile Definition export, & collision flags.
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
                className="text-[10px] bg-amber-600 hover:bg-amber-500 text-black font-bold px-2 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Layer
              </button>
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
                      title={`Clear all tiles on L${idx}`}
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
                      title={`Delete L${idx}`}
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

          {/* ACTIVE TILESET HEADER & CONTROLS */}
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
                      title="Tileset Settings (Resize grid)"
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

            {/* Quick Search */}
            {tilesets.length > 3 && (
              <div className="relative mb-1">
                <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tilesets in map..."
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
                    {t.imageSource} (GID {t.firstgid}+)
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-[11px] text-amber-300/70 italic px-2 py-1.5 bg-black/40 border border-amber-500/20 rounded-lg flex items-center justify-between">
                <span>{tilesets.length === 0 ? 'No tilesets in active map' : 'No matching tilesets'}</span>
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

          {/* PIXEL CANVAS / PREVIEW */}
          {ts && !imgError ? (
            <div className="bg-black/80 rounded-xl border border-amber-500/30 overflow-auto max-h-[70vh] relative mt-1 custom-scrollbar">
               <div className="relative inline-block min-w-full">
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
                     setNatural({ w: el.naturalWidth, h: el.naturalHeight });
                     setImgError(false);
                   }}
                   className="cursor-crosshair w-full select-none touch-none"
                   style={{ imageRendering: 'pixelated', minWidth: `${ts.columns * ts.tilewidth}px` }}
                   onError={() => {
                     setImgError(true);
                   }}
                 />
                 {hoveredTile && (
                   <div
                     className={`pointer-events-none absolute border-2 transition-all duration-75 ${
                       dragStart
                         ? 'border-amber-400 bg-amber-400/30 ring-1 ring-black shadow-[0_0_12px_rgba(245,158,11,0.6)] z-20'
                         : 'border-cyan-400 bg-cyan-400/25 ring-1 ring-black shadow-[0_0_0_1px_rgba(0,0,0,0.9)]'
                     }`}
                     style={{
                       left: `${hoveredTile.leftPct}%`,
                       top: `${hoveredTile.topPct}%`,
                       width: `${hoveredTile.widthPct}%`,
                       height: `${hoveredTile.heightPct}%`,
                     }}
                   />
                 )}
                 {selection && !dragStart && (
                   <div
                     className="pointer-events-none absolute border-2 border-amber-400 bg-amber-400/20 ring-1 ring-black shadow-[0_0_0_1px_rgba(0,0,0,0.9)] z-10"
                     style={{
                       left: `${selection.leftPct}%`,
                       top: `${selection.topPct}%`,
                       width: `${selection.widthPct}%`,
                       height: `${selection.heightPct}%`,
                     }}
                     title={`Selected local ${selection.local}`}
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

          {/* METADATA & SOURCE COORDINATE STRIP */}
          {ts && natural.w > 0 && (
            <div className="flex flex-col gap-1 px-2 py-1.5 bg-black/50 rounded-lg border border-slate-800 text-[9px] text-slate-400">
              <div className="flex items-center justify-between">
                <span>Source: {natural.w}×{natural.h}px ({ts.columns} cols)</span>
                <span>GID {ts.firstgid}..{ts.firstgid + Math.floor(natural.h / ts.tileheight) * ts.columns - 1}</span>
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
                    <span>Save as Tile Def</span>
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* ACTIVE BRUSH FOOTER */}
          <div className="flex justify-between items-center text-[10px] text-amber-200 bg-[#0b1320] border border-amber-500/20 p-2 rounded-lg">
            <span className="font-bold">Active Brush GID:</span>
            <div className="flex items-center gap-2">
              {hoveredTile && !imgError && (
                <span className="text-[10px] text-cyan-400 font-bold">Hover: GID {hoveredTile.gid}</span>
              )}
              <span className="font-bold text-black bg-amber-400 px-2 py-0.5 rounded shadow">{activeBrushTileId}</span>
            </div>
          </div>
        </>
      ) : (
        /* ─── TILE LIBRARY VIEW ─── */
        <div className="flex flex-col gap-2">
          {/* Search & Tag filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Tile Library..."
              value={libraryFilter}
              onChange={(e) => setLibraryFilter(e.target.value)}
              className="w-full bg-[#050b14] border border-slate-700 rounded-lg pl-8 pr-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[9px]">
            {['ALL', 'grass', 'water', 'path', 'wall', 'solid', 'wood', 'stone'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setLibraryTagFilter(tag)}
                className={`px-2 py-0.5 rounded-full border transition-all shrink-0 cursor-pointer font-bold ${
                  libraryTagFilter === tag
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-black/40 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {tag.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Tile Definitions Grid */}
          <div className="grid grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
            {tileDefinitions
              .filter((def) => {
                if (libraryFilter && !def.name.toLowerCase().includes(libraryFilter.toLowerCase())) return false;
                if (libraryTagFilter !== 'ALL' && !def.tags.includes(libraryTagFilter)) return false;
                return true;
              })
              .map((def) => (
                <div
                  key={def.id}
                  onClick={() => {
                    soundSynth?.playSelectSound?.();
                    onBrushSelect(def.gid);
                    showToast(`Selected Tile Def: ${def.name}`);
                  }}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                    activeBrushTileId === def.gid
                      ? 'bg-amber-500/20 border-amber-500 shadow-md ring-1 ring-amber-400'
                      : 'bg-[#08101d] border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold truncate text-amber-300">{def.name}</span>
                    <span className="text-[8px] px-1 py-0.2 rounded bg-black/60 border border-slate-700 text-slate-400">
                      {def.sourceWidth}×{def.sourceHeight}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[9px]">
                    <span className={`px-1.5 py-0.2 rounded font-bold ${
                      def.collision === 'SOLID' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                      def.collision === 'WATER' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {def.collision}
                    </span>
                    <span className="text-[9px] text-slate-500 truncate">{def.material}</span>
                  </div>

                  <div className="text-[8px] text-slate-500 truncate">
                    Src: {def.sourceSheet.split('/').pop()} [X:{def.sourceX}, Y:{def.sourceY}]
                  </div>
                </div>
              ))}
          </div>

          {tileDefinitions.length === 0 && (
            <div className="p-4 rounded-xl border border-slate-800 bg-black/40 text-center text-slate-500 text-xs">
              No saved tile definitions in library. Select a region in the Tileset Palette and click &quot;Save as Tile Def&quot;.
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

            {/* Search filter in catalog */}
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

            {/* Asset List Grid */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[350px] pr-1 custom-scrollbar">
              {loadingAssets ? (
                <div className="text-center py-8 text-xs text-slate-500">Querying asset manager...</div>
              ) : availableTilesetAssets.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 space-y-2">
                  <p>No tileset assets match your search.</p>
                  <p className="text-[10px] text-slate-500">Upload new tilesets in Asset Manager or install bundled packs in Setup.</p>
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
                            className="text-xs font-bold bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black px-3 py-1.5 rounded-lg shadow transition cursor-pointer"
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
              <span>{availableTilesetAssets.length} tilesets available in library</span>
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
                <label className="block text-slate-400 mb-2 font-bold uppercase text-[10px]">Quick Grid Presets</label>
                <div className="grid grid-cols-4 gap-2">
                  {[16, 32, 64, 128].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        soundSynth?.playUiClick?.();
                        const cols = Math.max(1, Math.floor(natural.w / size));
                        handleUpdateTilesetSettings({ tilewidth: size, tileheight: size, columns: cols, imagewidth: natural.w, imageheight: natural.h });
                        showToast(`Grid set to ${size}x${size}px`);
                      }}
                      className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        ts.tilewidth === size && ts.tileheight === size
                          ? 'bg-amber-500 text-black shadow-sm'
                          : 'bg-black/60 border border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {size}px
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <label className="block text-slate-400 mb-2 font-bold uppercase text-[10px]">Custom Grid Size</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <span className="text-[9px] text-slate-500 uppercase mb-1 block">Width</span>
                    <input
                      type="number"
                      min="1"
                      value={ts.tilewidth}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 16;
                        handleUpdateTilesetSettings({ 
                          tilewidth: val,
                          columns: Math.max(1, Math.floor(natural.w / val)),
                          imagewidth: natural.w,
                          imageheight: natural.h
                        });
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
                  Adjusting width auto-calculates columns, but you can override it here if the image has margins.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TILE PALETTE RIGHT-CLICK CONTEXT MENU */}
      {tileContextMenu && (
        <div
          className="fixed z-[9999] bg-[#0c1424] border border-amber-500/40 rounded-xl shadow-2xl p-2 flex flex-col gap-1 min-w-[240px] text-xs font-mono text-slate-200 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          style={{ left: tileContextMenu.x, top: tileContextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Tile Info & Mini Preview */}
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
              <span className="text-amber-300 font-bold text-xs">Tile GID #{tileContextMenu.gid}</span>
              <span className="text-[10px] text-slate-400 truncate">
                Local #{tileContextMenu.localId} ({tileContextMenu.ts.tilewidth}×{tileContextMenu.ts.tileheight}px)
              </span>
              <span className="text-[9px] text-slate-500 truncate">
                Row {tileContextMenu.row}, Col {tileContextMenu.col}
              </span>
            </div>
          </div>

          {/* Quick Brush Selection */}
          <button
            type="button"
            onClick={() => {
              soundSynth?.playSelectSound?.();
              onBrushSelect(tileContextMenu.gid);
              setTileContextMenu(null);
              showToast(`Selected Tile GID #${tileContextMenu.gid} as Brush`);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-500/20 text-slate-200 hover:text-amber-200 text-left transition cursor-pointer"
          >
            <Brush className="w-3.5 h-3.5 text-amber-400" />
            <span>Select as Active Brush</span>
          </button>

          {/* Fill Active Layer */}
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
            <span>Fill Active Layer (L{activeLayerIdx})</span>
          </button>

          {/* Fill Entire Ground (L0) */}
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
            <span>Fill Entire Map Ground (L0)</span>
          </button>

          {/* Save as Canonical Tile Definition */}
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
            <span>Save as Tile Definition</span>
          </button>

          {/* Download / Export Individual Tile */}
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
                  `Exported tile as individual PNG (${tileContextMenu.ts.tilewidth}×${tileContextMenu.ts.tileheight}px)`
                );
                setTileContextMenu(null);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-500/20 text-slate-200 hover:text-amber-200 text-left transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Raw PNG</span>
            </button>
          )}

          {/* Set Default Ground GID */}
          {onSetDefaultGroundGid && (
            <button
              type="button"
              onClick={() => {
                soundSynth?.playActionSound?.();
                onSetDefaultGroundGid(tileContextMenu.gid);
                showToast(`Set GID #${tileContextMenu.gid} as Realm Default Ground`);
                setTileContextMenu(null);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-500/20 text-slate-200 hover:text-amber-200 text-left transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Set as Default Ground GID</span>
            </button>
          )}

          {/* Copy Tile GID */}
          <button
            type="button"
            onClick={() => {
              soundSynth?.playUiClick?.();
              navigator.clipboard.writeText(String(tileContextMenu.gid));
              showToast(`Copied GID #${tileContextMenu.gid} to clipboard`);
              setTileContextMenu(null);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-500/20 text-slate-200 hover:text-amber-200 text-left transition cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>Copy Tile GID</span>
          </button>

          {/* Per-Tile Gameplay & Collision Toggles */}
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
                  showToast(`Marked GID #${tileContextMenu.gid} as Solid Collision`);
                  setTileContextMenu(null);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/20 text-slate-200 hover:text-rose-300 text-left transition cursor-pointer text-[11px]"
              >
                <Shield className="w-3.5 h-3.5 text-rose-400" />
                <span>Mark as Solid Collision</span>
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
                  showToast(`Marked GID #${tileContextMenu.gid} as Swimmable Water`);
                  setTileContextMenu(null);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-sky-500/20 text-slate-200 hover:text-sky-300 text-left transition cursor-pointer text-[11px]"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Mark as Swimmable Water</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SAVE AS TILE DEFINITION MODAL */}
      {isSaveDefModalOpen && pendingDef && (
        <div className="fixed inset-0 z-[450] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-[#050b14] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Save Tile Definition to Library</span>
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
              <div>
                <label className="block text-slate-400 mb-1 text-[10px] uppercase font-bold">Tile Definition Name</label>
                <input
                  type="text"
                  value={pendingDef.name || ''}
                  onChange={(e) => setPendingDef({ ...pendingDef, name: e.target.value })}
                  placeholder="e.g. Forest Grass Tile"
                  className="w-full bg-black/60 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="p-2 rounded-lg bg-black/40 border border-slate-800">
                  <span className="text-slate-500 block">Source Sheet:</span>
                  <span className="text-slate-200 font-bold truncate block">{pendingDef.sourceSheet?.split('/').pop()}</span>
                </div>
                <div className="p-2 rounded-lg bg-black/40 border border-slate-800">
                  <span className="text-slate-500 block">Source Rect:</span>
                  <span className="text-amber-300 font-bold block">
                    X:{pendingDef.sourceX} Y:{pendingDef.sourceY} ({pendingDef.sourceWidth}×{pendingDef.sourceHeight}px)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 text-[10px] uppercase font-bold">Collision Type</label>
                  <select
                    value={pendingDef.collision || 'NONE'}
                    onChange={(e) => setPendingDef({ ...pendingDef, collision: e.target.value as any })}
                    className="w-full bg-black/60 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="NONE">None (Passable)</option>
                    <option value="SOLID">Solid (Obstacle)</option>
                    <option value="WATER">Water (Swimmable)</option>
                    <option value="LEDGE">Ledge</option>
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
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition cursor-pointer text-xs"
              >
                Save to Tile Library
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

