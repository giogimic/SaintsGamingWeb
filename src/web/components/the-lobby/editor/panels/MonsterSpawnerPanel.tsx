'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteMapSpawner,
  listMapSpawners,
  placeMapSpawner,
  updateMapSpawner,
  type MapSpawnerData,
} from '@/app/actions/map-spawners';
import { Save, Loader2, Trash2 } from 'lucide-react';
import {
  defaultFieldValues,
  LOGIC_COMPONENT_PRESETS,
} from '@/shared/game/logicComponents';
import { CatalogEditorShell } from '../components/CatalogEditorShell';
import { SchemaFieldRenderer } from '../components/SchemaFieldRenderer';
import { toBaseMapId } from '@/shared/net/mapIds';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';

export const MonsterSpawnerPanel: React.FC = () => {
  const showToast = useGameStore((state) => state.showToast);
  const currentMapId = useGameStore((state) => state.currentMapId);
  const mapId = toBaseMapId((currentMapId || '').split('#')[0] || '');

  const preset = useMemo(
    () => LOGIC_COMPONENT_PRESETS.find((p) => p.kind === 'monster_spawner'),
    []
  );

  const defaultProps = useMemo(() => {
    if (!preset) return {};
    return defaultFieldValues(preset);
  }, [preset]);

  const [entityProps, setEntityProps] = useState<Record<string, unknown>>(() => ({
    ...defaultProps,
    name: 'Wild Spawner',
  }));

  const [saving, setSaving] = useState(false);
  const [list, setList] = useState<MapSpawnerData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const clickedTile = useEditorStore((state) => state.clickedTile);
  const [spawnX, setSpawnX] = useState(10);
  const [spawnY, setSpawnY] = useState(10);

  const reloadList = useCallback(async () => {
    if (!mapId) {
      setList([]);
      return;
    }
    const res = await listMapSpawners(mapId);
    if (res.success && res.data) setList(res.data);
  }, [mapId]);

  useEffect(() => {
    void reloadList();
  }, [reloadList]);

  useEffect(() => {
    if (clickedTile) {
      setSpawnX(clickedTile.c);
      setSpawnY(clickedTile.r);
    }
  }, [clickedTile]);

  const onFieldChange = (key: string, value: unknown) => {
    setEntityProps((prev) => ({ ...prev, [key]: value }));
  };

  const handleNew = () => {
    setSelectedId(null);
    setEntityProps({
      ...defaultProps,
      name: 'Wild Spawner',
    });
  };

  const handleSelect = (spawner: MapSpawnerData) => {
    setSelectedId(spawner.id);
    setEntityProps((prev) => ({
      ...prev,
      name: spawner.name,
      monsterPool: spawner.monsterPool,
      maxPopulation: spawner.maxPopulation,
      wanderRadius: spawner.wanderRadius,
      respawnDelayMs: spawner.respawnDelayMs,
      aggroRadius: spawner.aggroRadius,
      level: spawner.level,
      lootPoolId: spawner.lootPoolId || '',
      difficulty: spawner.difficulty,
    }));
    setSpawnX(spawner.x);
    setSpawnY(spawner.y);
  };

  const handleSave = async () => {
    if (!mapId) {
      showToast('No active map — enter a world first.');
      return;
    }
    const name = String(entityProps.name || 'Wild Spawner');
    setSaving(true);

    const payload = {
      mapId,
      name,
      x: spawnX,
      y: spawnY,
      monsterPool: String(entityProps.monsterPool || 'rockitten'),
      maxPopulation: Number(entityProps.maxPopulation) || 3,
      wanderRadius: Number(entityProps.wanderRadius) || 5,
      respawnDelayMs: Number(entityProps.respawnDelayMs) || 30000,
      aggroRadius: Number(entityProps.aggroRadius) || 4,
      level: Number(entityProps.level) || 1,
      lootPoolId: String(entityProps.lootPoolId || '').trim() || undefined,
      difficulty: String(entityProps.difficulty || 'normal'),
    };

    if (selectedId) {
      const res = await updateMapSpawner({ ...payload, spawnerId: selectedId });
      setSaving(false);
      if (res.success && res.spawner) {
        useEditorStore.getState().markMapDirty();
        showToast(`Updated ${name}. Reload map to apply.`);
        await reloadList();
      } else {
        showToast(res.error || 'Failed to update spawner');
      }
      return;
    }

    const res = await placeMapSpawner(payload);
    setSaving(false);
    if (res.success && res.spawner) {
      setSelectedId(res.spawner.id);
      useEditorStore.getState().markMapDirty();
      showToast(`Placed ${name} on ${mapId} (${res.count} spawners). Reload map to apply.`);
      await reloadList();
    } else {
      showToast(res.error || 'Failed to save spawner');
    }
  };

  const handleDelete = async () => {
    if (!mapId || !selectedId) return;
    if (!confirm(`Delete ${selectedId} from ${mapId}?`)) return;
    setSaving(true);
    const res = await deleteMapSpawner({ mapId, spawnerId: selectedId });
    setSaving(false);
    if (res.success) {
      useEditorStore.getState().markMapDirty();
      showToast(`Deleted ${selectedId}`);
      setSelectedId(null);
      await reloadList();
    } else {
      showToast(res.error || 'Failed to delete');
    }
  };

  const formSection = (
    <div className="space-y-4">
      <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
          Placement Location
        </label>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-[10px] text-slate-500 mb-1 block">X / Column</label>
            <input
              type="number"
              value={spawnX}
              onChange={(e) => setSpawnX(parseInt(e.target.value) || 0)}
              className="w-full bg-black/40 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-rose-500/50"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-slate-500 mb-1 block">Y / Row</label>
            <input
              type="number"
              value={spawnY}
              onChange={(e) => setSpawnY(parseInt(e.target.value) || 0)}
              className="w-full bg-black/40 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-rose-500/50"
            />
          </div>
        </div>
        <p className="text-[10px] text-slate-500 mt-2 italic">
          Click any tile in the world to update these coordinates.
        </p>
      </div>

      <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
          Spawner Identity
        </label>
        <div className="mb-3">
          <label className="text-[10px] text-slate-500 mb-1 block">Spawner Name</label>
          <input
            type="text"
            value={(entityProps.name as string) || ''}
            onChange={(e) => onFieldChange('name', e.target.value)}
            className="w-full bg-black/40 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-rose-500/50"
          />
        </div>
      </div>

      {preset?.fields && preset.fields.length > 0 && (
        <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
            Spawner Configuration
          </label>
          <div className="grid grid-cols-1 gap-y-3">
            {preset.fields.map((f) => (
              <div key={f.key}>
                <label className="text-[10px] text-slate-500 mb-1 block">{f.label}</label>
                {f.type === 'enum' && f.options ? (
                  <select
                    value={String(entityProps[f.key] ?? f.defaultValue)}
                    onChange={(e) => onFieldChange(f.key, e.target.value)}
                    className="w-full bg-black/40 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-rose-500/50"
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
                    value={String(entityProps[f.key] ?? '')}
                    onChange={(e) =>
                      onFieldChange(
                        f.key,
                        f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                      )
                    }
                    className="w-full bg-black/40 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-rose-500/50"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-rose-900/40 hover:bg-rose-900/60 text-rose-200 py-2 rounded-lg font-bold border border-rose-800/50 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {selectedId ? 'Update Spawner' : 'Place Spawner'}
        </button>

        <button
          onClick={() => {
            if (!mapId) return;
            const pool = String(entityProps.monsterPool || 'slime');
            const pop = parseInt(String(entityProps.maxPopulation || 3), 10);
            
            showToast(`Live testing ${pop}x ${pool} spawner...`);
            
            for (let i = 0; i < pop; i++) {
              const dx = (Math.random() - 0.5) * 4;
              const dy = (Math.random() - 0.5) * 4;
              const payload = {
                id: `test_spawn_${Date.now()}_${i}`,
                name: pool,
                x: spawnX + dx,
                y: spawnY + dy,
                sprite: pool
              };
              useGameStore.getState().emitSocketEvent?.('studio_spawn_npc', {
                mapId,
                npc: payload
              });
            }
          }}
          type="button"
          className="flex-1 bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-200 py-2 rounded-lg font-bold border border-emerald-800/50 flex items-center justify-center transition-colors"
        >
          Live Test
        </button>
        {selectedId && (
          <button
            onClick={handleDelete}
            disabled={saving}
            className="flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl px-3 py-2 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  const sidebarContent = (
    <div className="space-y-1">
      {list.map((spawner) => (
        <button
          key={spawner.id}
          onClick={() => handleSelect(spawner)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm flex flex-col gap-1 transition-colors ${
            selectedId === spawner.id
              ? 'bg-rose-500/20 border border-rose-500/30 text-rose-300'
              : 'hover:bg-slate-800/50 text-slate-300 border border-transparent'
          }`}
        >
          <div className="font-medium truncate">{spawner.name}</div>
          <div className="text-[10px] text-slate-500 truncate font-mono">
            {spawner.monsterPool} @ [{spawner.x}, {spawner.y}]
          </div>
        </button>
      ))}
      {list.length === 0 && (
        <div className="text-center py-8 text-xs text-slate-500 italic">No spawners on this map</div>
      )}
    </div>
  );

  return (
    <CatalogEditorShell
      title="Monster Spawners"
      toolbar={
        <button onClick={handleNew} className="text-[10px] bg-slate-800 px-2 py-1 rounded hover:bg-slate-700 text-emerald-400 font-bold uppercase tracking-wider">
          + New Spawner
        </button>
      }
      list={sidebarContent}
    >
      {formSection}
    </CatalogEditorShell>
  );
};
