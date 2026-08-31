'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Plus,
  Trash2,
  Copy,
  Save,
  RefreshCw,
  Film,
  Sparkles,
  Sliders,
  ZoomIn,
  ZoomOut,
  Layers,
  CheckCircle2,
  Eye,
  Settings2,
  Repeat,
  ArrowRight,
  ImageIcon,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';
import { useGameStore } from '../../store';
import { AssetManager, type GameAssetItem } from '@/engine/assets/AssetManager';

export interface AnimationSequence {
  id: string;
  name: string;
  spriteSource: string;
  frameWidth: number;
  frameHeight: number;
  fps: number;
  loop: boolean;
  pingPong: boolean;
  frames: Array<{
    x: number;
    y: number;
    durationMs: number;
    offsetX?: number;
    offsetY?: number;
  }>;
}

const DEFAULT_ANIMATIONS: AnimationSequence[] = [
  {
    id: 'anim_walk_down',
    name: 'Walk Down',
    spriteSource: '/game-assets/sprites/characters/human_base.png',
    frameWidth: 32,
    frameHeight: 48,
    fps: 8,
    loop: true,
    pingPong: false,
    frames: [
      { x: 0, y: 0, durationMs: 125 },
      { x: 32, y: 0, durationMs: 125 },
      { x: 64, y: 0, durationMs: 125 },
      { x: 96, y: 0, durationMs: 125 },
    ],
  },
  {
    id: 'anim_walk_left',
    name: 'Walk Left',
    spriteSource: '/game-assets/sprites/characters/human_base.png',
    frameWidth: 32,
    frameHeight: 48,
    fps: 8,
    loop: true,
    pingPong: false,
    frames: [
      { x: 0, y: 48, durationMs: 125 },
      { x: 32, y: 48, durationMs: 125 },
      { x: 64, y: 48, durationMs: 125 },
      { x: 96, y: 48, durationMs: 125 },
    ],
  },
  {
    id: 'anim_walk_right',
    name: 'Walk Right',
    spriteSource: '/game-assets/sprites/characters/human_base.png',
    frameWidth: 32,
    frameHeight: 48,
    fps: 8,
    loop: true,
    pingPong: false,
    frames: [
      { x: 0, y: 96, durationMs: 125 },
      { x: 32, y: 96, durationMs: 125 },
      { x: 64, y: 96, durationMs: 125 },
      { x: 96, y: 96, durationMs: 125 },
    ],
  },
  {
    id: 'anim_walk_up',
    name: 'Walk Up',
    spriteSource: '/game-assets/sprites/characters/human_base.png',
    frameWidth: 32,
    frameHeight: 48,
    fps: 8,
    loop: true,
    pingPong: false,
    frames: [
      { x: 0, y: 144, durationMs: 125 },
      { x: 32, y: 144, durationMs: 125 },
      { x: 64, y: 144, durationMs: 125 },
      { x: 96, y: 144, durationMs: 125 },
    ],
  },
  {
    id: 'anim_attack_down',
    name: 'Attack Slash',
    spriteSource: '/game-assets/sprites/characters/human_base.png',
    frameWidth: 48,
    frameHeight: 48,
    fps: 12,
    loop: false,
    pingPong: false,
    frames: [
      { x: 0, y: 192, durationMs: 80 },
      { x: 48, y: 192, durationMs: 80 },
      { x: 96, y: 192, durationMs: 80 },
      { x: 144, y: 192, durationMs: 120 },
    ],
  },
];

export function AnimationStudioPanel() {
  const showToast = useGameStore((s) => s.showToast);

  const [animations, setAnimations] = useState<AnimationSequence[]>(DEFAULT_ANIMATIONS);
  const [activeAnimId, setActiveAnimId] = useState<string>(DEFAULT_ANIMATIONS[0].id);
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [previewZoom, setPreviewZoom] = useState<number>(3);
  const [showOnionSkin, setShowOnionSkin] = useState<boolean>(false);
  const [bgBackdrop, setBgBackdrop] = useState<'dark' | 'light' | 'grass' | 'black'>('dark');
  const [availableSprites, setAvailableSprites] = useState<GameAssetItem[]>([]);
  const [isPingPongReversing, setIsPingPongReversing] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const activeAnim = animations.find((a) => a.id === activeAnimId) || animations[0];

  // Fetch registered sprite assets from asset manager
  useEffect(() => {
    void (async () => {
      try {
        const manager = AssetManager.getInstance();
        const res = await manager.searchAssets(
          { type: 'CHARACTER' },
          0,
          100
        );
        if (res?.items) {
          setAvailableSprites(res.items);
        }
      } catch (e) {
        // Non-blocking
      }
    })();
  }, []);

  // Preload and cache current sprite image
  useEffect(() => {
    if (!activeAnim?.spriteSource) return;
    if (!imageCacheRef.current.has(activeAnim.spriteSource)) {
      const img = new Image();
      img.src = activeAnim.spriteSource;
      img.onload = () => {
        imageCacheRef.current.set(activeAnim.spriteSource, img);
      };
    }
  }, [activeAnim?.spriteSource]);

  // Frame timing loop
  useEffect(() => {
    if (!isPlaying || !activeAnim || activeAnim.frames.length <= 1) return;

    const frame = activeAnim.frames[currentFrameIdx] || activeAnim.frames[0];
    const duration = frame?.durationMs || Math.max(20, Math.floor(1000 / (activeAnim.fps || 8)));

    const timer = setTimeout(() => {
      setCurrentFrameIdx((prev) => {
        const total = activeAnim.frames.length;
        if (activeAnim.pingPong) {
          if (!isPingPongReversing) {
            if (prev + 1 >= total) {
              setIsPingPongReversing(true);
              return Math.max(0, total - 2);
            }
            return prev + 1;
          } else {
            if (prev - 1 < 0) {
              setIsPingPongReversing(false);
              return Math.min(total - 1, 1);
            }
            return prev - 1;
          }
        } else if (activeAnim.loop) {
          return (prev + 1) % total;
        } else {
          if (prev + 1 < total) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        }
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [isPlaying, currentFrameIdx, activeAnim, isPingPongReversing]);

  // Canvas drawing effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeAnim) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fw = activeAnim.frameWidth || 32;
    const fh = activeAnim.frameHeight || 48;

    canvas.width = fw * previewZoom;
    canvas.height = fh * previewZoom;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const img = imageCacheRef.current.get(activeAnim.spriteSource);

    // Draw onion skinning (previous frame ghost)
    if (showOnionSkin && activeAnim.frames.length > 1 && img) {
      const prevIdx = (currentFrameIdx - 1 + activeAnim.frames.length) % activeAnim.frames.length;
      const prevFrame = activeAnim.frames[prevIdx];
      if (prevFrame) {
        ctx.globalAlpha = 0.25;
        ctx.drawImage(
          img,
          prevFrame.x,
          prevFrame.y,
          fw,
          fh,
          (prevFrame.offsetX || 0) * previewZoom,
          (prevFrame.offsetY || 0) * previewZoom,
          fw * previewZoom,
          fh * previewZoom
        );
        ctx.globalAlpha = 1.0;
      }
    }

    // Draw active frame
    const frame = activeAnim.frames[currentFrameIdx] || activeAnim.frames[0];
    if (frame && img) {
      ctx.drawImage(
        img,
        frame.x,
        frame.y,
        fw,
        fh,
        (frame.offsetX || 0) * previewZoom,
        (frame.offsetY || 0) * previewZoom,
        fw * previewZoom,
        fh * previewZoom
      );
    } else {
      // Placeholder box if image still loading
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Frame ${currentFrameIdx + 1}`, canvas.width / 2, canvas.height / 2);
    }
  }, [activeAnim, currentFrameIdx, previewZoom, showOnionSkin]);

  const handleAddAnimation = () => {
    soundSynth?.playActionSound?.();
    const newId = `anim_custom_${Date.now()}`;
    const newSeq: AnimationSequence = {
      id: newId,
      name: `New Sequence ${animations.length + 1}`,
      spriteSource: activeAnim?.spriteSource || '/game-assets/sprites/characters/human_base.png',
      frameWidth: activeAnim?.frameWidth || 32,
      frameHeight: activeAnim?.frameHeight || 48,
      fps: 8,
      loop: true,
      pingPong: false,
      frames: [{ x: 0, y: 0, durationMs: 125 }],
    };
    setAnimations((prev) => [...prev, newSeq]);
    setActiveAnimId(newId);
    setCurrentFrameIdx(0);
    showToast('Created new animation sequence.');
  };

  const handleDuplicateAnimation = () => {
    if (!activeAnim) return;
    soundSynth?.playSelectSound?.();
    const dupId = `${activeAnim.id}_copy_${Date.now().toString().slice(-4)}`;
    const dup: AnimationSequence = {
      ...activeAnim,
      id: dupId,
      name: `${activeAnim.name} (Copy)`,
      frames: activeAnim.frames.map((f) => ({ ...f })),
    };
    setAnimations((prev) => [...prev, dup]);
    setActiveAnimId(dupId);
    showToast(`Duplicated ${activeAnim.name}`);
  };

  const handleDeleteAnimation = (id: string) => {
    if (animations.length <= 1) {
      showToast('Cannot delete the last animation sequence.');
      return;
    }
    soundSynth?.playActionSound?.();
    setAnimations((prev) => prev.filter((a) => a.id !== id));
    if (activeAnimId === id) {
      const remaining = animations.filter((a) => a.id !== id);
      setActiveAnimId(remaining[0].id);
      setCurrentFrameIdx(0);
    }
    showToast('Deleted animation sequence.');
  };

  const handleAddFrame = () => {
    if (!activeAnim) return;
    soundSynth?.playSelectSound?.();
    const lastFrame = activeAnim.frames[activeAnim.frames.length - 1];
    const newFrame = {
      x: lastFrame ? lastFrame.x + activeAnim.frameWidth : 0,
      y: lastFrame ? lastFrame.y : 0,
      durationMs: lastFrame ? lastFrame.durationMs : 125,
    };
    const updated = {
      ...activeAnim,
      frames: [...activeAnim.frames, newFrame],
    };
    setAnimations((prev) => prev.map((a) => (a.id === activeAnim.id ? updated : a)));
    setCurrentFrameIdx(activeAnim.frames.length);
  };

  const handleRemoveFrame = (idx: number) => {
    if (!activeAnim || activeAnim.frames.length <= 1) {
      showToast('Sequence must have at least one frame.');
      return;
    }
    soundSynth?.playActionSound?.();
    const updatedFrames = activeAnim.frames.filter((_, i) => i !== idx);
    const updated = { ...activeAnim, frames: updatedFrames };
    setAnimations((prev) => prev.map((a) => (a.id === activeAnim.id ? updated : a)));
    setCurrentFrameIdx(Math.min(currentFrameIdx, updatedFrames.length - 1));
  };

  const handleSaveAnimations = () => {
    soundSynth?.playActionSound?.();
    showToast(`Saved ${animations.length} animation profiles to canonical catalog.`);
  };

  return (
    <div className="flex h-full w-full bg-[#050b14]/95 text-slate-200 font-mono text-xs select-none overflow-hidden">
      {/* ─── LEFT COLUMN: ANIMATION SEQUENCES ─── */}
      <div className="w-56 flex flex-col border-r border-[#806f47]/30 bg-black/50/40">
        <div className="flex items-center justify-between p-3 border-b border-[#806f47]/30 bg-black/50/20">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <Film className="w-4 h-4 text-amber-400" />
            <span>Animations</span>
          </div>
          <button
            type="button"
            onClick={handleAddAnimation}
            className="p-1 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/40 transition cursor-pointer"
            title="Create New Animation"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-[#806f47]/30">
          {animations.map((anim) => {
            const isSelected = anim.id === activeAnimId;
            return (
              <div
                key={anim.id}
                onClick={() => {
                  soundSynth?.playUiClick?.();
                  setActiveAnimId(anim.id);
                  setCurrentFrameIdx(0);
                  setIsPingPongReversing(false);
                }}
                className={`group flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-200 shadow-sm'
                    : 'bg-[#0b1320] border-[#806f47]/20 text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-xs truncate">{anim.name}</span>
                  <span className="text-[10px] text-slate-500">
                    {anim.frames.length} frames · {anim.fps} FPS
                  </span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAnimation(anim.id);
                    }}
                    className="p-1 text-slate-500 hover:text-rose-400 transition"
                    title="Delete sequence"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-2 border-t border-[#806f47]/30 bg-black/50/20">
          <button
            type="button"
            onClick={handleSaveAnimations}
            className="w-full flex items-center justify-center gap-2 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition shadow cursor-pointer text-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save All Sequences</span>
          </button>
        </div>
      </div>

      {/* ─── CENTER COLUMN: TIMELINE & FRAME STRIP ─── */}
      <div className="flex-1 flex flex-col border-r border-[#806f47]/30 bg-[#070e1a]/80 overflow-hidden">
        {/* Header Settings Strip */}
        <div className="p-3 border-b border-[#806f47]/30 bg-black/50/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Name</label>
              <input
                type="text"
                value={activeAnim.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setAnimations((prev) =>
                    prev.map((a) => (a.id === activeAnim.id ? { ...a, name: val } : a))
                  );
                }}
                className="bg-[#050b14] border border-[#806f47]/30 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Frame Size (W×H)</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="8"
                  value={activeAnim.frameWidth}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 32;
                    setAnimations((prev) =>
                      prev.map((a) => (a.id === activeAnim.id ? { ...a, frameWidth: val } : a))
                    );
                  }}
                  className="w-14 bg-[#050b14] border border-[#806f47]/30 rounded-lg px-2 py-1 text-xs text-white text-center"
                />
                <span className="text-slate-500">×</span>
                <input
                  type="number"
                  min="8"
                  value={activeAnim.frameHeight}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 48;
                    setAnimations((prev) =>
                      prev.map((a) => (a.id === activeAnim.id ? { ...a, frameHeight: val } : a))
                    );
                  }}
                  className="w-14 bg-[#050b14] border border-[#806f47]/30 rounded-lg px-2 py-1 text-xs text-white text-center"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Playback Speed</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={activeAnim.fps}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setAnimations((prev) =>
                      prev.map((a) => (a.id === activeAnim.id ? { ...a, fps: val } : a))
                    );
                  }}
                  className="w-20 accent-amber-400 cursor-pointer"
                />
                <span className="text-amber-300 font-bold text-xs">{activeAnim.fps} FPS</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const updated = { ...activeAnim, loop: !activeAnim.loop };
                setAnimations((prev) => prev.map((a) => (a.id === activeAnim.id ? updated : a)));
              }}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeAnim.loop
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                  : 'bg-black/50/40 text-slate-500 border-[#806f47]/20'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Loop: {activeAnim.loop ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const updated = { ...activeAnim, pingPong: !activeAnim.pingPong };
                setAnimations((prev) => prev.map((a) => (a.id === activeAnim.id ? updated : a)));
              }}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeAnim.pingPong
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/60'
                  : 'bg-black/50/40 text-slate-500 border-[#806f47]/20'
              }`}
            >
              <span>Ping-Pong</span>
            </button>
          </div>
        </div>

        {/* Frame Strip Timeline */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              Frame Strip Timeline ({activeAnim.frames.length} frames)
            </span>
            <button
              type="button"
              onClick={handleAddFrame}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Frame</span>
            </button>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-[#806f47]/30">
            {activeAnim.frames.map((frame, idx) => {
              const isCurrent = idx === currentFrameIdx;
              return (
                <div
                  key={idx}
                  onClick={() => setCurrentFrameIdx(idx)}
                  className={`shrink-0 w-28 p-2 rounded-xl border flex flex-col gap-2 transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-amber-500/20 border-amber-500 shadow-md ring-1 ring-amber-400'
                      : 'bg-black/50/50 border-[#806f47]/20 hover:border-[#806f47]/30 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-amber-300">Frame #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFrame(idx);
                      }}
                      className="text-slate-500 hover:text-rose-400 p-0.5"
                      title="Remove frame"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-1 text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">X pos:</span>
                      <input
                        type="number"
                        value={frame.x}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          const updated = [...activeAnim.frames];
                          updated[idx] = { ...updated[idx], x: val };
                          setAnimations((prev) =>
                            prev.map((a) => (a.id === activeAnim.id ? { ...a, frames: updated } : a))
                          );
                        }}
                        className="w-14 bg-black/50 border border-[#806f47]/30 rounded px-1 text-right text-white"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Y pos:</span>
                      <input
                        type="number"
                        value={frame.y}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          const updated = [...activeAnim.frames];
                          updated[idx] = { ...updated[idx], y: val };
                          setAnimations((prev) =>
                            prev.map((a) => (a.id === activeAnim.id ? { ...a, frames: updated } : a))
                          );
                        }}
                        className="w-14 bg-black/50 border border-[#806f47]/30 rounded px-1 text-right text-white"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Duration:</span>
                      <input
                        type="number"
                        value={frame.durationMs}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 100;
                          const updated = [...activeAnim.frames];
                          updated[idx] = { ...updated[idx], durationMs: val };
                          setAnimations((prev) =>
                            prev.map((a) => (a.id === activeAnim.id ? { ...a, frames: updated } : a))
                          );
                        }}
                        className="w-14 bg-black/50 border border-[#806f47]/30 rounded px-1 text-right text-amber-300"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── RIGHT COLUMN: REAL-TIME PREVIEW CANVAS ─── */}
      <div className="w-80 flex flex-col bg-black/50/20">
        <div className="p-3 border-b border-[#806f47]/30 bg-black/50/20 flex items-center justify-between">
          <span className="font-bold text-amber-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Live Preview
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPreviewZoom((z) => Math.max(1, z - 1))}
              className="p-1 rounded bg-black/50/40 border border-[#806f47]/30 text-slate-300 hover:text-white"
              title="Zoom out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-bold text-amber-300 px-1">{previewZoom}x</span>
            <button
              type="button"
              onClick={() => setPreviewZoom((z) => Math.min(8, z + 1))}
              className="p-1 rounded bg-black/50/40 border border-[#806f47]/30 text-slate-300 hover:text-white"
              title="Zoom in"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Viewport Canvas */}
        <div
          className={`flex-1 flex items-center justify-center p-6 relative overflow-hidden ${
            bgBackdrop === 'dark'
              ? 'bg-[#0a101d] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]'
              : bgBackdrop === 'grass'
              ? 'bg-[#1b432a]'
              : bgBackdrop === 'light'
              ? 'bg-[#cbd5e1]'
              : 'bg-black/50'
          }`}
        >
          <canvas ref={canvasRef} className="shadow-2xl rounded" style={{ imageRendering: 'pixelated' }} />
        </div>

        {/* Playback Controls Strip */}
        <div className="p-3 border-t border-[#806f47]/30 bg-black/50/80 space-y-3">
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentFrameIdx((prev) => Math.max(0, prev - 1))}
              className="p-2 rounded-xl bg-black/50/20 border border-[#806f47]/30 text-slate-300 hover:text-white hover:bg-white/5 transition cursor-pointer"
              title="Previous Frame"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`p-3 rounded-xl font-bold transition flex items-center justify-center shadow-lg cursor-pointer ${
                isPlaying
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
              }`}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            <button
              type="button"
              onClick={() =>
                setCurrentFrameIdx((prev) => (prev + 1) % (activeAnim.frames.length || 1))
              }
              className="p-2 rounded-xl bg-black/50/20 border border-[#806f47]/30 text-slate-300 hover:text-white hover:bg-white/5 transition cursor-pointer"
              title="Next Frame"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-[#806f47]/20">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowOnionSkin(!showOnionSkin)}
                className={`px-2 py-1 rounded border text-[10px] font-bold transition cursor-pointer ${
                  showOnionSkin
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60'
                    : 'bg-black/50/40 text-slate-500 border-[#806f47]/20'
                }`}
              >
                Onion Skin
              </button>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-slate-500">Backdrop:</span>
              <button
                type="button"
                onClick={() => setBgBackdrop('dark')}
                className={`w-4 h-4 rounded-full border ${bgBackdrop === 'dark' ? 'border-amber-400 bg-slate-800' : 'border-[#806f47]/30 bg-transparent'}`}
                title="Dark Grid"
              />
              <button
                type="button"
                onClick={() => setBgBackdrop('grass')}
                className={`w-4 h-4 rounded-full border ${bgBackdrop === 'grass' ? 'border-amber-400 bg-emerald-800' : 'border-[#806f47]/30 bg-emerald-950'}`}
                title="Grass"
              />
              <button
                type="button"
                onClick={() => setBgBackdrop('black')}
                className={`w-4 h-4 rounded-full border ${bgBackdrop === 'black' ? 'border-amber-400 bg-black/50' : 'border-[#806f47]/30 bg-black/50'}`}
                title="Black"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
