'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import { Settings, Trees, Plus, X, Paintbrush, MapPin, MessageSquare, ScrollText } from 'lucide-react';
import { GAME_MAPS } from '../../data/maps';
import {
  LOGIC_COMPONENT_PRESETS,
  buildPayloadsFromFields,
  defaultFieldValues,
  normalizeGates,
  removeWarpGateAt,
  upsertWarpGate,
  type LogicComponentKind,
  type LogicComponentPreset,
} from '@/shared/game/logicComponents';
import {
  WindowMenuBar,
  WindowMenuDropdown,
  WindowMenuButton,
  WindowMenuDivider,
} from '../WindowMenuBar';
import { soundSynth } from '@/engine/sound-synth';

export const PropertiesPanel: React.FC = () => {
  const currentMapId = useGameStore((state) => state.currentMapId);
  const activeMapData = useGameStore((state) => state.activeMapData);
  const showToast = useGameStore((state) => state.showToast);
  const logicTiles = useGameStore((state) => state.logicTiles);
  const fetchLogicTiles = useGameStore((state) => state.fetchLogicTiles);
  // Everything this panel paints lands on Logic (−1), so it drives the logic
  // brush rather than the visual GID brush.
  const setBrush = useEditorStore((s) => s.setActiveLogicTileId);
  const setLayer = useEditorStore((s) => s.setActiveLayerIdx);
  const setStudioMode = useEditorStore((s) => s.setStudioMode);
  const brushId = useEditorStore((s) => s.activeLogicTileId);
  const clickedTile = useEditorStore((s) => s.clickedTile);

  const currentMapData = activeMapData || GAME_MAPS[currentMapId] || {
    id: currentMapId,
    encounterPool: [],
    gates: [],
  };

  const [componentKind, setComponentKind] = useState<LogicComponentKind>('harvest_wood');
  const preset = useMemo(
    () => LOGIC_COMPONENT_PRESETS.find((p) => p.kind === componentKind) || LOGIC_COMPONENT_PRESETS[0],
    [componentKind]
  );
  const [fieldValues, setFieldValues] = useState<Record<string, string | number>>(() =>
    defaultFieldValues(LOGIC_COMPONENT_PRESETS[0])
  );
  const [templateId, setTemplateId] = useState(20);
  const [templateName, setTemplateName] = useState(LOGIC_COMPONENT_PRESETS[0].name);
  const [showAdvancedJson, setShowAdvancedJson] = useState(false);





  useEffect(() => {
    if (Object.keys(logicTiles).length === 0) {
      void fetchLogicTiles();
    }
  }, [logicTiles, fetchLogicTiles]);

  useEffect(() => {
    setFieldValues(defaultFieldValues(preset));
    setTemplateName(preset.name);
  }, [preset]);



  const applyPresetBrush = (p: LogicComponentPreset) => {
    if (p.paintTileId == null) {
      showToast('No seeded tile for this component — register a template first.');
      return;
    }
    setLayer(-1);
    setBrush(p.paintTileId);
    showToast(`Brush: ${p.label} (#${p.paintTileId}) — paint, Walk Mode to test, then Save`);
  };

  const handleSaveLogicTile = async () => {
    try {
      const { onInteractPayload, onStepPayload } = buildPayloadsFromFields(preset, fieldValues);
      const payload = {
        id: templateId,
        name: templateName || preset.name,
        color: preset.color,
        isSolid: preset.isSolid,
        interactable: preset.interactable,
        onInteractAction: preset.onInteractAction,
        onInteractPayload,
        onStepAction: preset.onStepAction,
        onStepPayload,
      };
      const res = await fetch('/api/world/logic-tiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showToast(`Registered ${payload.name} (#${payload.id})`);
        await useGameStore.getState().fetchLogicTiles();
        setLayer(-1);
        setBrush(Number(payload.id));
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err?.error || 'Failed to save component');
      }
    } catch {
      showToast('Failed to save component');
    }
  };

  const handlePaintWith = (id: number, name: string) => {
    setLayer(-1);
    setBrush(id);
    showToast(`Brush: ${name} (#${id}) on Logic (−1)`);
  };

  const registered = Object.values(logicTiles).sort((a, b) => a.id - b.id);
  const mapGates = normalizeGates(currentMapData.gates);

  return (
    <div className="space-y-4 text-xs font-mono -m-3 mb-0">
      {/* ── SUB-MENU APP BAR ── */}
      <WindowMenuBar>
        <WindowMenuDropdown
          label="Presets"
          icon={Trees}
          items={LOGIC_COMPONENT_PRESETS.map((p) => ({
            label: p.label,
            onClick: () => {
              setComponentKind(p.kind);
              applyPresetBrush(p);
            },
          }))}
        />
        <WindowMenuDropdown
          label="Mode"
          items={[
            {
              label: 'Visual Mode (Layer 0)',
              onClick: () => {
                setLayer(0);
                showToast('Switched to Visual Layer 0');
              },
            },
            {
              label: 'Logic Mode (Layer -1)',
              active: true,
              onClick: () => {
                setLayer(-1);
                showToast('Active Layer: Logic (-1)');
              },
            },
          ]}
        />
        <WindowMenuDivider />
        <WindowMenuButton
          label="Clear Selection"
          onClick={() => useEditorStore.setState({ clickedTile: null })}
          disabled={!clickedTile}
          title="Deselect active tile coordinate"
        />
        <div className="flex-1" />
        {clickedTile && (
          <span className="rounded bg-primary/20 border border-primary/40 px-2 py-0.5 text-[9px] font-bold text-primary shrink-0">
            X:{clickedTile.c} Y:{clickedTile.r}
          </span>
        )}
      </WindowMenuBar>

      <div className="p-3 space-y-4">
      {/* SELECTION CONTEXT */}
      <div className="bg-[#0b1320]/60 border border-[#cbb26a]/40 rounded p-3 space-y-2 shadow-[0_0_15px_rgba(203,178,106,0.1)]">
        <div className="flex items-center gap-1.5 font-bold text-[#e2d5b3] border-b border-[#cbb26a]/30 pb-1 uppercase tracking-widest text-[10px]">
          <MapPin className="w-4 h-4" /> Selection Context
        </div>
        {clickedTile ? (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-[#050b14] border border-[#806f47]/30 p-2 rounded">
                <span className="text-slate-500 block mb-0.5">Coordinates</span>
                <span className="text-white font-bold">X: {clickedTile.c} <span className="text-[#806f47]">|</span> Y: {clickedTile.r}</span>
              </div>
              <div className="bg-[#050b14] border border-[#806f47]/30 p-2 rounded">
                <span className="text-slate-500 block mb-0.5">Base Tile ID</span>
                <span className="text-white font-bold">
                  {currentMapData?.grid?.[clickedTile.r]?.[clickedTile.c] ?? 'Empty (0)'}
                </span>
              </div>
            </div>
            
            {/* Logic Tile Data */}
            {(() => {
              const logicId = currentMapData?.grid?.[clickedTile.r]?.[clickedTile.c];
              const logicObj = logicId && logicTiles[logicId];
              if (!logicObj) return null;
              return (
                <div className="bg-[#050b14] border border-blue-900/40 p-2 rounded flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-sm ${logicObj.color || 'bg-blue-500'}`} />
                  <div>
                    <span className="block text-white font-bold">{logicObj.name} <span className="text-slate-500 font-normal">#{logicObj.id}</span></span>
                    {logicObj.onInteractAction && <span className="text-blue-300 text-[9px] block">Interact: {logicObj.onInteractAction}</span>}
                  </div>
                </div>
              );
            })()}

            {/* Warp Gate Data */}
            {mapGates.some(g => g.position.x === clickedTile.c && g.position.y === clickedTile.r) && (
              <div className="bg-purple-900/20 border border-purple-500/30 p-2 rounded">
                <span className="text-purple-300 font-bold block mb-0.5">Warp Gate Present</span>
                <span className="text-purple-200/70 block text-[9px]">Target: {mapGates.find(g => g.position.x === clickedTile.c && g.position.y === clickedTile.r)?.targetMapId}</span>
              </div>
            )}

            {/* NPC Entities at coordinate */}
            {currentMapData?.npcs?.filter((n: any) => n.position?.x === clickedTile.c && n.position?.y === clickedTile.r).map((npc: any) => (
              <div key={npc.id} className="bg-emerald-950/30 border border-emerald-500/40 p-2 rounded flex items-center justify-between">
                <div>
                  <span className="text-emerald-300 font-bold block">{npc.name}</span>
                  <span className="text-[9px] text-slate-400">Sprite: {npc.assetProfileId} · {npc.dialogId ? `Dialog: ${npc.dialogId}` : 'No Dialog'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-slate-500 italic py-2 text-center text-[10px]">
            Click a tile in the viewport to inspect its properties.
          </div>
        )}
      </div>

      <div className="bg-[#0b1320]/60 border border-[#806f47]/30 rounded p-3 text-[10px] text-slate-400 leading-relaxed">
        Fun-first: pick a component → paint on Logic (−1) → <span className="text-[#e2d5b3]">Walk Mode</span> to feel it → tweak →{' '}
        <span className="text-[#e2d5b3]">Save Map</span>.
      </div>

      {/* Quick components (bible tags) */}
      <div className="bg-[#0b1320]/60 border border-[#806f47]/30 rounded p-2 space-y-2">
        <div className="flex items-center gap-1.5 font-bold text-[#cbb26a] border-b border-[#806f47]/30 pb-1">
          <Paintbrush className="w-3.5 h-3.5" /> Components (paint)
        </div>
        <div className="grid grid-cols-2 gap-1">
          {LOGIC_COMPONENT_PRESETS.filter((p) => p.paintTileId != null && !p.kind.startsWith('gate_')).map((p) => (
            <button
              key={p.kind}
              type="button"
              onClick={() => {
                setComponentKind(p.kind);
                applyPresetBrush(p);
              }}
              className={`rounded border px-2 py-1.5 text-left transition-all ${
                componentKind === p.kind
                  ? 'border-[#cbb26a] bg-[#806f47]/25 text-white'
                  : 'border-[#806f47]/20 bg-[#050b14] text-slate-300 hover:border-[#806f47]/40'
              }`}
              title={p.description}
            >
              <div className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${p.color}`} />
                <span className="truncate font-bold text-[10px]">{p.label}</span>
              </div>
              <div className="mt-0.5 text-[8px] uppercase tracking-wider text-slate-500">#{p.tag}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Dialogue / Quest — existing docks */}
      <div className="bg-[#0b1320]/60 border border-[#806f47]/30 rounded p-2 space-y-2">
        <div className="flex items-center gap-1.5 font-bold text-[#cbb26a] border-b border-[#806f47]/30 pb-1">
          <MessageSquare className="w-3.5 h-3.5" /> Dialogue & Quest Giver
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Dialogue trees and ACCEPT_QUEST live on NPCs — use the NPC / Quest docks (not raw tile JSON).
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setStudioMode('npc')}
            className="flex-1 rounded border border-[#806f47]/40 bg-[#806f47]/15 py-1 text-[10px] font-bold text-[#e2d5b3] hover:bg-[#806f47]/30"
          >
            Open NPC
          </button>
          <button
            type="button"
            onClick={() => setStudioMode('quest')}
            className="flex-1 rounded border border-[#806f47]/40 bg-[#806f47]/15 py-1 text-[10px] font-bold text-[#e2d5b3] hover:bg-[#806f47]/30 flex items-center justify-center gap-1"
          >
            <ScrollText className="w-3 h-3" /> Quest
          </button>
        </div>
      </div>


      {/* Registered tags — paint as brush */}
      <div className="bg-[#0b1320]/60 border border-[#806f47]/30 rounded p-2 space-y-2">
        <div className="flex items-center gap-1.5 font-bold text-[#cbb26a] border-b border-[#806f47]/30 pb-1">
          <Paintbrush className="w-3.5 h-3.5" /> Place Tag on Logic (−1)
        </div>
        {registered.length === 0 ? (
          <p className="text-[10px] text-slate-500">No tags loaded yet.</p>
        ) : (
          <div className="max-h-40 space-y-1 overflow-y-auto custom-scrollbar">
            {registered.map((tile) => (
              <button
                key={tile.id}
                type="button"
                onClick={() => handlePaintWith(tile.id, tile.name)}
                className={`flex w-full items-center gap-2 rounded border px-2 py-1 text-left ${
                  brushId === tile.id
                    ? 'border-[#cbb26a] bg-[#806f47]/20 text-white'
                    : 'border-[#806f47]/20 bg-[#050b14] text-slate-300 hover:border-[#806f47]/40'
                }`}
              >
                <span className={`h-3 w-3 shrink-0 rounded-sm ${tile.color || 'bg-slate-600'}`} />
                <span className="min-w-0 flex-1 truncate font-bold">{tile.name}</span>
                <span className="text-[9px] text-slate-500">#{tile.id}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* COMPONENT REGISTRY — forms, not raw JSON */}
      <div className="bg-[#0b1320]/60 border border-[#806f47]/30 rounded p-2 space-y-2">
        <div className="flex items-center gap-1.5 font-bold text-[#cbb26a] border-b border-[#806f47]/30 pb-1">
          <Settings className="w-3.5 h-3.5" /> Register Component Template
        </div>

        <label className="block text-[10px] text-slate-400">Component</label>
        <select
          value={componentKind}
          onChange={(e) => setComponentKind(e.target.value as LogicComponentKind)}
          className="w-full bg-[#050b14] border border-[#806f47]/30 rounded px-2 py-1.5 text-slate-200"
        >
          {LOGIC_COMPONENT_PRESETS.map((p) => (
            <option key={p.kind} value={p.kind}>
              {p.label} (#{p.tag})
            </option>
          ))}
        </select>
        <p className="text-[10px] text-slate-500 leading-relaxed">{preset.description}</p>

        <label className="block text-[10px] text-slate-400">ID / Name</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={templateId}
            onChange={(e) => setTemplateId(parseInt(e.target.value) || 20)}
            className="w-16 bg-[#050b14] border border-[#806f47]/30 rounded px-1 py-1 text-center"
          />
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="flex-1 bg-[#050b14] border border-[#806f47]/30 rounded px-1 py-1"
          />
        </div>

        {preset.fields.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-[#806f47]/20">
            {preset.fields.map((f) => (
              <div key={f.key}>
                <label className="block text-[10px] text-slate-400">{f.label}</label>
                {f.type === 'enum' && f.options ? (
                  <select
                    value={String(fieldValues[f.key] ?? f.defaultValue)}
                    onChange={(e) =>
                      setFieldValues((prev) => ({
                        ...prev,
                        [f.key]: e.target.value,
                      }))
                    }
                    className="w-full bg-[#050b14] border border-[#806f47]/30 rounded px-2 py-1 text-[11px]"
                  >
                    {f.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type === 'number' ? 'number' : 'text'}
                    step={f.type === 'number' ? 'any' : undefined}
                    value={fieldValues[f.key] ?? f.defaultValue}
                    onChange={(e) =>
                      setFieldValues((prev) => ({
                        ...prev,
                        [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value,
                      }))
                    }
                    className="w-full bg-[#050b14] border border-[#806f47]/30 rounded px-2 py-1 text-[11px]"
                  />
                )}
                {f.key === 'lootPoolId' && (
                  <button
                    type="button"
                    onClick={() => {
                      setStudioMode('creature');
                      showToast('Opened Loot Manager. Copy a pool ID and paste it here.');
                    }}
                    className="mt-1 w-full text-[9px] uppercase tracking-wider font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded py-0.5 hover:bg-emerald-500/20 transition-colors"
                  >
                    Link Loot Table
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 text-[10px] text-slate-400">
          <span className={`rounded px-1.5 py-0.5 ${preset.isSolid ? 'bg-red-900/40 text-red-200' : 'bg-emerald-900/40 text-emerald-200'}`}>
            {preset.isSolid ? 'solid' : 'passable'}
          </span>
          {preset.interactable && (
            <span className="rounded bg-sky-900/40 px-1.5 py-0.5 text-sky-200">interact</span>
          )}
          {preset.onStepAction && (
            <span className="rounded bg-amber-900/40 px-1.5 py-0.5 text-amber-200">step:{preset.onStepAction}</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowAdvancedJson((v) => !v)}
          className="text-[9px] text-slate-500 underline hover:text-slate-300"
        >
          {showAdvancedJson ? 'Hide' : 'Show'} advanced action preview
        </button>
        {showAdvancedJson && (
          <pre className="max-h-24 overflow-auto rounded bg-black/50/50 p-2 text-[9px] text-slate-400">
            {JSON.stringify(
              {
                onInteractAction: preset.onInteractAction,
                ...buildPayloadsFromFields(preset, fieldValues),
                onStepAction: preset.onStepAction,
              },
              null,
              2
            )}
          </pre>
        )}

        <button
          onClick={handleSaveLogicTile}
          className="w-full mt-1 py-1.5 bg-[#806f47]/80 hover:bg-[#806f47] text-white rounded font-bold"
        >
          Register & Paint
        </button>
      </div>
      </div>
    </div>
  );
};
