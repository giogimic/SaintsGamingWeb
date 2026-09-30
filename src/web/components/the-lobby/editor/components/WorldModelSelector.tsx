import React, { useState, useEffect } from 'react';
import { Box, Image as ImageIcon, BoxSelect, Cuboid, MoreHorizontal, Crosshair, ChevronDown, ChevronUp, Layers, EyeOff, Shield } from 'lucide-react';
import { CharacterSpritePreview } from '@/client/ui/shared/CharacterSpritePreview';
import { cn } from '@/shared/lib/utils';
import { useEditorStore } from '../editor-store';
import { CHARACTER_MODEL_PROFILES } from '@/shared/game/characterProfiles';

export type WorldModelType = '2D Sprite' | '2D Box Sprite' | '3D Model' | 'Other';

export interface GripTransform {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

export interface WorldModelValue {
  type: WorldModelType;
  assetId: string;
  modelUrl?: string | null;
  source?: string | null;
  /** Per-actor scale override; the shared asset remains unchanged. */
  scale?: number;
  isModular?: boolean;
  partOfSet?: string;
  skeletonConnectionPoints?: string;
  socket?: string;
  attachOffset?: GripTransform;
  sheathedSocket?: string;
  sheathedOffset?: GripTransform;
  attachmentMode?: 'RIGID_SOCKET' | 'SKINNED';
  hidesComponents?: string[];
  bodyType?: string;
  label?: string;
  category?: string;
  defaultVisible?: boolean;
  availableInCharacterCreation?: boolean;
}

export const STANDARD_SOCKET_OPTIONS = [
  { id: 'RightHandMount', label: 'Right Hand (Weapon / Tool)', boneHint: 'Hand_R' },
  { id: 'LeftHandMount', label: 'Left Hand (Shield / Offhand)', boneHint: 'Hand_L' },
  { id: 'TwoHandedGrip', label: 'Two-Handed Grip (Main + Offhand IK)', boneHint: 'Hand_R' },
  { id: 'HeadMount', label: 'Head / Helmet (Hat, Mask, Glasses)', boneHint: 'Head' },
  { id: 'ChestMount', label: 'Chest / Torso (Backpack, Cape, Wings)', boneHint: 'Spine' },
  { id: 'SheathedBack', label: 'Sheathed Back (Stowed 2H / Bow / Quiver)', boneHint: 'Spine' },
  { id: 'SheathedHip_L', label: 'Sheathed Hip Left (Stowed 1H / Dagger)', boneHint: 'Pelvis' },
  { id: 'SheathedHip_R', label: 'Sheathed Hip Right (Stowed Sidearm / Pouch)', boneHint: 'Pelvis' },
];

export const HIDEABLE_COMPONENT_OPTIONS = [
  { id: 'hair', label: 'Hide Hair' },
  { id: 'beard', label: 'Hide Facial Hair' },
  { id: 'head_accessory', label: 'Hide Head Accessories' },
  { id: 'torso', label: 'Hide Torso/Shirt' },
  { id: 'legs', label: 'Hide Legs/Pants' },
  { id: 'feet', label: 'Hide Feet/Boots' },
];

interface WorldModelSelectorProps {
  value: WorldModelValue;
  onChange: (value: WorldModelValue) => void;
  label?: string;
  description?: string;
  allowSocketConfig?: boolean;
  allowModularConfig?: boolean;
}

const MODEL_OPTIONS: { id: WorldModelType; label: string; icon: any; isImplemented: boolean }[] = [
  { id: '3D Model', label: '3D Model', icon: Cuboid, isImplemented: true },
  { id: '2D Sprite', label: '2D Sprite', icon: ImageIcon, isImplemented: true },
];

export function WorldModelSelector({
  value,
  onChange,
  label = "World Model",
  description = "How this actor is represented in the physical game world.",
  allowSocketConfig = false,
  allowModularConfig = false,
}: WorldModelSelectorProps) {
  const [mounted, setMounted] = useState(false);
  const [scaleInput, setScaleInput] = useState(String(value.scale ?? 1));
  const [showSocketDetails, setShowSocketDetails] = useState(Boolean(value.socket || value.attachmentMode));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setScaleInput(String(value.scale ?? 1));
  }, [value.scale]);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between border-b border-cyan-500/10 pb-1">
        <div className="text-[9px] font-black text-cyan-500/60 uppercase tracking-[0.2em]">
          {label}
        </div>
        
        {/* Compact Type Selector */}
        <div className="flex gap-1">
          {MODEL_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = value.type === opt.id;
            return (
              <button
                type="button"
                key={opt.id}
                onClick={() => onChange({ ...value, type: opt.id })}
                title={opt.label}
                className={cn(
                  "p-1.5 rounded transition-all border cursor-pointer flex items-center justify-center",
                  isActive
                    ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.2)]"
                    : "bg-transparent border-transparent text-slate-600 hover:text-slate-400 hover:bg-white/5"
                )}
              >
                <Icon size={12} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Asset Picker / Preview */}
      <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg border border-border/50">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden bg-white/5 border border-white/10">
          {value.type === '2D Sprite' ? (
            value.assetId ? (
              <CharacterSpritePreview assetProfileId={value.assetId} size={24} scale={1.5} />
            ) : (
              <ImageIcon className="w-4 h-4 text-slate-600" />
            )
          ) : value.type === '3D Model' ? (
            value.assetId ? (
               <Cuboid className="w-5 h-5 text-cyan-400" />
            ) : (
               <Box className="w-4 h-4 text-slate-600" />
            )
          ) : (
            <span className="text-[8px] text-slate-500 font-bold uppercase rotate-[-15deg]">WIP</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {value.type === '2D Sprite' ? (
            <button
              type="button"
              onClick={() => {
                useEditorStore.getState().openAssetPicker({
                  filterType: 'CHARACTER',
                  title: 'Select World 2D Sprite',
                  onSelect: (selectedId) => {
                    let cleanId = selectedId;
                    if (cleanId.includes('sprites/characters/')) {
                      cleanId = cleanId.split('sprites/characters/')[1].replace('.png', '');
                    }
                    onChange({ ...value, assetId: cleanId });
                  },
                });
              }}
              className="w-full flex items-center justify-between p-2 bg-[#050b14] border border-cyan-500/30 hover:border-cyan-400 rounded-lg transition text-left cursor-pointer"
            >
              <div className="flex flex-col min-w-0 mr-2">
                <span className="text-[11px] font-bold text-foreground truncate">
                  {value.assetId || 'Select Asset...'}
                </span>
                <span className="text-[9px] text-muted-foreground mt-0.5 truncate">
                  {description}
                </span>
              </div>
              <ImageIcon className="w-3 h-3 text-cyan-400 shrink-0" />
            </button>
          ) : value.type === '3D Model' ? (
            <div className="w-full flex flex-col gap-2 p-3 bg-[#050b14] border border-cyan-500/30 rounded-lg transition text-left">
              {/* Quick Profile Presets */}
              <div className="flex flex-wrap gap-1 mb-1">
                {Object.values(CHARACTER_MODEL_PROFILES).map((p) => {
                  const isCur = value.assetId === p.id || value.modelUrl === p.modelUrl || (value.assetId && value.assetId.includes(p.id));
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onChange({
                          ...value,
                          assetId: p.id,
                          modelUrl: p.modelUrl,
                          source: p.modelUrl,
                        });
                      }}
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer border",
                        isCur
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                          : "bg-black/50 border-slate-800 text-slate-400 hover:text-white hover:border-slate-600"
                      )}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>

              {/* Added native AssetId selector like 2D Sprite */}
              <button
                type="button"
                onClick={() => {
                  useEditorStore.getState().openAssetPicker({
                    filterType: 'MODEL',
                    categoryFilter: 'CHARACTERS',
                    title: 'Select Base Playable Character',
                    onSelect: (selectedId) => {
                      onChange({ ...value, assetId: selectedId });
                    },
                  });
                }}
                className="w-full flex items-center justify-between p-2 bg-black/40 border border-slate-700 hover:border-cyan-400 rounded-lg transition text-left cursor-pointer mb-2"
              >
                <div className="flex flex-col min-w-0 mr-2">
                  <span className="text-[11px] font-bold text-cyan-300 truncate">
                    {value.assetId || 'Select 3D Model Asset...'}
                  </span>
                  <span className="text-[9px] text-muted-foreground mt-0.5 truncate">
                    Uploaded GLB model file to use
                  </span>
                </div>
                <Cuboid className="w-3 h-3 text-cyan-400 shrink-0" />
              </button>
              <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Model scale</label>
                  <p className="text-[9px] text-slate-500 mt-0.5">Applies to this archetype or entity only.</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={scaleInput}
                    onChange={(event) => {
                      const rawValue = event.target.value;
                      setScaleInput(rawValue);
                      const nextScale = Number(rawValue);
                      if (rawValue && Number.isFinite(nextScale) && nextScale > 0 && nextScale <= 100) {
                        onChange({ ...value, scale: nextScale });
                      }
                    }}
                    onBlur={() => {
                      const parsedScale = Number(scaleInput);
                      const nextScale = Number.isFinite(parsedScale) && parsedScale > 0
                        ? Math.max(0.01, Math.min(100, parsedScale))
                        : value.scale ?? 1;
                      setScaleInput(String(nextScale));
                      onChange({ ...value, scale: nextScale });
                    }}
                    aria-label="This actor's model scale"
                    className="w-24 bg-black/40 border border-slate-700 rounded px-2 py-1.5 text-right text-[11px] text-white font-mono focus:border-cyan-400 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">×</span>
                </div>
              </div>

              {/* Socket & Grip Calibration (Weapons, Tools, Helmets, Modular Pieces) */}
              {(allowSocketConfig || value.socket || value.attachmentMode || value.isModular) && (
                <div className="mt-3 pt-3 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowSocketDetails(!showSocketDetails)}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      <Crosshair size={12} />
                      <span className="uppercase tracking-wider">Socket & Grip Calibration</span>
                      {showSocketDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    {value.socket && (
                      <span className="text-[9px] font-mono bg-cyan-950/60 border border-cyan-800 text-cyan-300 px-2 py-0.5 rounded">
                        {value.socket}
                      </span>
                    )}
                  </div>

                  {showSocketDetails && (
                    <div className="space-y-3 bg-black/30 p-3 rounded-lg border border-slate-800/80">
                      {/* Attachment Mode Picker */}
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Attachment Mode
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => onChange({ ...value, attachmentMode: 'RIGID_SOCKET', isModular: false })}
                            className={cn(
                              "p-1.5 rounded text-[10px] font-bold border transition-all text-center cursor-pointer",
                              (value.attachmentMode !== 'SKINNED' && !value.isModular)
                                ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300"
                                : "bg-black/40 border-slate-800 text-slate-500 hover:text-slate-300"
                            )}
                          >
                            Rigid Bone Socket
                          </button>
                          <button
                            type="button"
                            onClick={() => onChange({ ...value, attachmentMode: 'SKINNED', isModular: true, socket: undefined })}
                            className={cn(
                              "p-1.5 rounded text-[10px] font-bold border transition-all text-center cursor-pointer",
                              (value.attachmentMode === 'SKINNED' || value.isModular)
                                ? "bg-amber-500/20 border-amber-500/60 text-amber-300"
                                : "bg-black/40 border-slate-800 text-slate-500 hover:text-slate-300"
                            )}
                          >
                            Skinned Mesh (Armor)
                          </button>
                        </div>
                        <p className="text-[8.5px] text-slate-500 mt-1">
                          {value.attachmentMode === 'SKINNED' || value.isModular
                            ? "Shares character skeleton bones & deforms with walking/running animations."
                            : "Attaches rigidly to a designated bone (e.g. hand grip, helmet, shield)."}
                        </p>
                      </div>

                      {/* Primary Socket (if Rigid Socket) */}
                      {value.attachmentMode !== 'SKINNED' && !value.isModular && (
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Mount Socket
                          </label>
                          <select
                            value={value.socket || ''}
                            onChange={(e) => onChange({ ...value, socket: e.target.value || undefined })}
                            className="w-full bg-black/60 border border-slate-700 rounded px-2 py-1.5 text-[11px] text-white font-mono focus:border-cyan-400 focus:outline-none"
                          >
                            <option value="">None / World Drop Only</option>
                            {STANDARD_SOCKET_OPTIONS.map((sock) => (
                              <option key={sock.id} value={sock.id}>
                                {sock.label} ({sock.boneHint})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Position Calibration [X, Y, Z] */}
                      {value.attachmentMode !== 'SKINNED' && !value.isModular && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              Grip Position Offset (X, Y, Z)
                            </label>
                            <span className="text-[8px] text-slate-500">Meters</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(['X', 'Y', 'Z'] as const).map((axis, axisIdx) => {
                              const pos = value.attachOffset?.position ?? [0, 0, 0];
                              const currentVal = pos[axisIdx] ?? 0;
                              return (
                                <div key={axis} className="flex items-center gap-1 bg-black/60 border border-slate-800 rounded px-1.5 py-1">
                                  <span className="text-[9px] font-bold text-cyan-400">{axis}</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={currentVal}
                                    onChange={(e) => {
                                      const newPos: [number, number, number] = [...pos];
                                      newPos[axisIdx] = parseFloat(e.target.value) || 0;
                                      onChange({
                                        ...value,
                                        attachOffset: {
                                          ...value.attachOffset,
                                          position: newPos,
                                        },
                                      });
                                    }}
                                    className="w-full bg-transparent text-right text-[10px] text-white font-mono outline-none"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Rotation Calibration [Pitch, Yaw, Roll in Deg] */}
                      {value.attachmentMode !== 'SKINNED' && !value.isModular && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              Grip Rotation (Pitch, Yaw, Roll)
                            </label>
                            <span className="text-[8px] text-slate-500">Degrees</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(['P', 'Y', 'R'] as const).map((axis, axisIdx) => {
                              const rot = value.attachOffset?.rotation ?? [0, 0, 0];
                              const currentVal = rot[axisIdx] ?? 0;
                              return (
                                <div key={axis} className="flex items-center gap-1 bg-black/60 border border-slate-800 rounded px-1.5 py-1">
                                  <span className="text-[9px] font-bold text-amber-400">{axis}</span>
                                  <input
                                    type="number"
                                    step="5"
                                    value={currentVal}
                                    onChange={(e) => {
                                      const newRot: [number, number, number] = [...rot];
                                      newRot[axisIdx] = parseFloat(e.target.value) || 0;
                                      onChange({
                                        ...value,
                                        attachOffset: {
                                          ...value.attachOffset,
                                          rotation: newRot,
                                        },
                                      });
                                    }}
                                    className="w-full bg-transparent text-right text-[10px] text-white font-mono outline-none"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Sheathed / Stowed Socket */}
                      {value.attachmentMode !== 'SKINNED' && !value.isModular && (
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Sheathed / Holster Socket
                          </label>
                          <select
                            value={value.sheathedSocket || ''}
                            onChange={(e) => onChange({ ...value, sheathedSocket: e.target.value || undefined })}
                            className="w-full bg-black/60 border border-slate-700 rounded px-2 py-1.5 text-[11px] text-white font-mono focus:border-cyan-400 focus:outline-none"
                          >
                            <option value="">None (Disappears when holstered)</option>
                            <option value="SheathedBack">Sheathed on Back (Spine)</option>
                            <option value="SheathedHip_L">Sheathed on Hip Left (Thigh_L / Pelvis)</option>
                            <option value="SheathedHip_R">Sheathed on Hip Right (Thigh_R / Pelvis)</option>
                          </select>
                        </div>
                      )}

                      {/* Anti-Clipping Component Hiding */}
                      <div className="pt-2 border-t border-slate-800/80">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <EyeOff size={11} className="text-amber-400" />
                          <span>Anti-Clipping: Hide Base Body Components</span>
                        </label>
                        <p className="text-[8.5px] text-slate-500 mb-2">
                          Automatically hides these base meshes when equipped (e.g. helmets hide hair/beards).
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {HIDEABLE_COMPONENT_OPTIONS.map((opt) => {
                            const isHidden = (value.hidesComponents || []).includes(opt.id);
                            return (
                              <label
                                key={opt.id}
                                className={cn(
                                  "flex items-center gap-1.5 p-1.5 rounded border text-[9.5px] cursor-pointer transition-all",
                                  isHidden
                                    ? "bg-amber-950/40 border-amber-500/50 text-amber-200"
                                    : "bg-black/30 border-slate-800 text-slate-400 hover:text-slate-300"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={isHidden}
                                  onChange={(e) => {
                                    const current = value.hidesComponents || [];
                                    const next = e.target.checked
                                      ? [...current, opt.id]
                                      : current.filter((k) => k !== opt.id);
                                    onChange({ ...value, hidesComponents: next });
                                  }}
                                  className="rounded bg-black/60 border-slate-700 text-amber-500 focus:ring-0 w-3 h-3"
                                />
                                <span>{opt.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full p-2 bg-rose-950/20 border border-rose-500/30 rounded-lg flex items-center justify-between">
              <span className="text-[10px] font-bold text-rose-300">Asset Workflow WIP</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
