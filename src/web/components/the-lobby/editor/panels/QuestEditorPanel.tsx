'use client';

/**
 * Studio Quest dock — ALIGNMENT Slice D.
 * Lists QuestTemplate rows; assigns ACCEPT_QUEST onto NpcDialogueTree via /api/npc-dialogue.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useGameStore } from '../../store';
import { ListTodo, Link2, RefreshCw } from 'lucide-react';

interface QuestObjectiveRow {
  id: string;
  stage: number;
  type: string;
  targetSlug: string;
  requiredQty: number;
  description: string;
}

interface QuestTemplateRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  objectives: QuestObjectiveRow[];
}

type MapNpc = { id?: string; name?: string; x?: number; y?: number };

export const QuestEditorPanel: React.FC = () => {
  const showToast = useGameStore((s) => s.showToast);
  const activeMapData = useGameStore((s) => s.activeMapData);

  const [quests, setQuests] = useState<QuestTemplateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);

  const npcs: MapNpc[] = Array.isArray(activeMapData?.npcs) ? activeMapData.npcs : [];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quests/templates', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setQuests(data.items ?? []);
    } catch (e) {
      showToast(
        `Failed to load quest templates: ${e instanceof Error ? e.message : 'unknown'}`
      );
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedQuest = quests.find((q) => q.slug === selectedSlug);
  const selectedNpc = npcs.find((n) => n?.id === selectedNpcId);

  const assignToNpc = async () => {
    if (!selectedSlug || !selectedNpc?.id || !selectedQuest) {
      showToast('Select a quest and an NPC from the map list.');
      return;
    }

    try {
      const res = await fetch('/api/npc-dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          npcId: selectedNpc.id,
          name: selectedNpc.name || selectedNpc.id,
          questSlug: selectedSlug,
          questLabel: `Accept: ${selectedQuest.title}`,
          text: `${selectedNpc.name || 'NPC'}: Need a hand with something?`,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(body?.error || `Assign failed (${res.status})`);
        return;
      }
      if (body.alreadyAssigned) {
        showToast(`«${selectedQuest.title}» already on ${selectedNpc.name || selectedNpc.id}`);
        return;
      }
      showToast(
        `Assigned «${selectedQuest.title}» → ${selectedNpc.name || selectedNpc.id} (DB). Restart lobby server if dialogue was already cached.`
      );
    } catch (e) {
      console.error('[Studio] quest assign failed', e);
      showToast('Quest assign failed');
    }
  };

  return (
    <div className="flex h-full flex-col space-y-3 text-xs font-mono">
      <div className="flex items-center justify-between border-b border-[#806f47]/30 pb-1.5">
        <div className="flex items-center gap-1.5 font-bold text-[#cbb26a]">
          <ListTodo className="h-3.5 w-3.5" />
          Quest Templates
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded p-1 text-slate-400 hover:bg-white/5 hover:text-white"
          title="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <p className="text-[10px] leading-relaxed text-slate-400">
        Slice D dock — lists seeded <span className="text-[#cbb26a]">QuestTemplate</span> rows.
        Assign adds an existing <span className="text-[#cbb26a]">ACCEPT_QUEST</span> option on the
        NPC&apos;s dialogue tree (no new engine).
      </p>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-1">
        {quests.length === 0 && !loading && (
          <p className="py-4 text-center text-[10px] text-slate-500">
            No templates. Demo boot seeds Q1–Q4 via DemoBootstrap.
          </p>
        )}
        {quests.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setSelectedSlug(q.slug)}
            className={`w-full rounded border px-2 py-1.5 text-left transition-colors ${
              selectedSlug === q.slug
                ? 'border-[#cbb26a]/50 bg-[#cbb26a]/10'
                : 'border-slate-700 bg-[#0b1320]/60 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-bold text-slate-100">{q.title}</span>
              <span className="shrink-0 text-[9px] text-slate-500">{q.slug}</span>
            </div>
            <p className="mt-0.5 line-clamp-2 text-[10px] text-slate-500">{q.description}</p>
            <p className="mt-1 text-[9px] text-slate-600">
              {q.objectives.length} objective{q.objectives.length === 1 ? '' : 's'}
            </p>
          </button>
        ))}
      </div>

      <div className="space-y-2 border-t border-[#806f47]/30 pt-2">
        <label className="block text-[10px] text-slate-400">Map NPC</label>
        <select
          value={selectedNpcId || ''}
          onChange={(e) => setSelectedNpcId(e.target.value || null)}
          className="w-full rounded border border-slate-700 bg-[#050b14] px-2 py-1.5 text-slate-200"
        >
          <option value="">
            {npcs.length ? '— select NPC —' : '— no NPCs on map (place in NPC mode) —'}
          </option>
          {npcs.map((n) => (
            <option key={n.id || `${n.x},${n.y}`} value={n.id || ''}>
              {(n.name || n.id || '?') +
                (typeof n.x === 'number' ? ` @ (${n.x},${n.y})` : '')}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={!selectedSlug || !selectedNpcId}
          onClick={() => void assignToNpc()}
          className="flex w-full items-center justify-center gap-1.5 rounded bg-[#806f47]/80 py-1.5 font-bold text-white hover:bg-[#806f47] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Link2 className="h-3.5 w-3.5" />
          Assign quest to NPC
        </button>
      </div>
    </div>
  );
};
