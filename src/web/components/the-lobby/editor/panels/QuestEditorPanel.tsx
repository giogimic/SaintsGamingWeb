'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  listQuestTemplates,
  upsertQuestTemplate,
  deleteQuestTemplate,
  type QuestObjectiveInput,
} from '@/app/actions/quest-templates';
import { useEditorStore } from '../editor-store';
import {
  Plus, Trash2, Save, RefreshCw, ScrollText, CheckCircle2, AlertCircle,
} from 'lucide-react';

const inputCls =
  'w-full bg-[#050b14] border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 font-mono outline-none focus:border-amber-700 transition-colors';
const labelCls = 'block text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] mb-1';

type QuestRow = {
  id: string;
  slug: string;
  gameId: string;
  title: string;
  description: string;
  levelReq: number;
  isRepeatable: boolean;
  rewards: string;
  objectives: Array<{
    stage: number;
    type: string;
    targetSlug: string;
    requiredQty: number;
    description: string;
  }>;
};

const emptyQuest = (gameId: string): Omit<QuestRow, 'id'> & { id?: string } => ({
  slug: '',
  gameId,
  title: '',
  description: '',
  levelReq: 1,
  isRepeatable: false,
  rewards: JSON.stringify({ items: [], gold: 0 }, null, 2),
  objectives: [
    { stage: 1, type: 'TALK', targetSlug: 'npc_', requiredQty: 1, description: '' },
  ],
});

export function QuestEditorPanel() {
  const activeGameId = useEditorStore((s) => s.activeGameId);
  const [list, setList] = useState<QuestRow[]>([]);
  const [form, setForm] = useState(emptyQuest(activeGameId));
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const load = useCallback(async () => {
    const res = await listQuestTemplates(activeGameId);
    if (res.success) setList(res.data as QuestRow[]);
  }, [activeGameId]);

  useEffect(() => {
    void load();
    setForm(emptyQuest(activeGameId));
    setIsNew(false);
  }, [load, activeGameId]);

  const showStatus = (type: 'success' | 'error', msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 3500);
  };

  const handleSelect = (q: QuestRow) => {
    setForm({
      ...q,
      rewards: (() => {
        try {
          return JSON.stringify(JSON.parse(q.rewards), null, 2);
        } catch {
          return q.rewards;
        }
      })(),
    });
    setIsNew(false);
  };

  const handleNew = () => {
    setForm(emptyQuest(activeGameId));
    setIsNew(true);
  };

  const handleSave = async () => {
    if (!form.slug || !form.title) {
      showStatus('error', 'Slug and title required.');
      return;
    }
    setLoading(true);
    const res = await upsertQuestTemplate({
      slug: form.slug,
      gameId: activeGameId,
      title: form.title,
      description: form.description,
      levelReq: form.levelReq,
      isRepeatable: form.isRepeatable,
      rewards: form.rewards,
      objectives: form.objectives as QuestObjectiveInput[],
    });
    setLoading(false);
    if (res.success) {
      showStatus('success', `${form.title} saved.`);
      setIsNew(false);
      await load();
    } else {
      showStatus('error', res.error || 'Save failed');
    }
  };

  const handleDelete = async () => {
    if (!form.slug || isNew) return;
    if (!confirm(`Delete quest ${form.slug}?`)) return;
    setLoading(true);
    const res = await deleteQuestTemplate(form.slug);
    setLoading(false);
    if (res.success) {
      showStatus('success', 'Deleted.');
      setForm(emptyQuest(activeGameId));
      setIsNew(false);
      await load();
    } else {
      showStatus('error', res.error || 'Delete failed');
    }
  };

  const setObj = (idx: number, patch: Partial<QuestObjectiveInput>) => {
    setForm((prev) => ({
      ...prev,
      objectives: prev.objectives.map((o, i) => (i === idx ? { ...o, ...patch } : o)),
    }));
  };

  return (
    <div className="flex flex-col h-full gap-3 text-xs font-mono min-h-0">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-[#cbb26a] font-bold">
          <ScrollText className="w-4 h-4" />
          Quests · {activeGameId}
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => void load()} className="p-1.5 rounded hover:bg-white/5 text-slate-400" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={handleNew} className="p-1.5 rounded hover:bg-white/5 text-emerald-400" title="New quest">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {status && (
        <div className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded ${status.type === 'success' ? 'bg-emerald-900/40 text-emerald-300' : 'bg-red-900/40 text-red-300'}`}>
          {status.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {status.msg}
        </div>
      )}

      <div className="grid grid-cols-5 gap-3 min-h-0 flex-1 overflow-hidden">
        <div className="col-span-2 overflow-y-auto space-y-1 border border-slate-800 rounded-lg p-1.5 bg-[#050b14]/50">
          {list.length === 0 && (
            <p className="text-slate-500 text-[10px] p-2">No quests for this profile. Seed Spyder or create one.</p>
          )}
          {list.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => handleSelect(q)}
              className={`w-full text-left px-2 py-1.5 rounded border transition-colors ${
                form.slug === q.slug && !isNew
                  ? 'border-amber-600/50 bg-amber-900/20 text-amber-100'
                  : 'border-transparent hover:bg-white/5 text-slate-300'
              }`}
            >
              <div className="font-bold text-[11px] truncate">{q.title}</div>
              <div className="text-[9px] text-slate-500 truncate">{q.slug}</div>
            </button>
          ))}
        </div>

        <div className="col-span-3 overflow-y-auto space-y-3 pr-1">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Slug</label>
              <input className={inputCls} value={form.slug} disabled={!isNew} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Title</label>
              <input className={inputCls} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className={`${inputCls} min-h-[48px]`}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelCls}>Rewards JSON</label>
            <textarea
              className={`${inputCls} min-h-[72px] font-mono`}
              value={form.rewards}
              onChange={(e) => setForm((p) => ({ ...p, rewards: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={labelCls + ' mb-0'}>Objectives</span>
              <button
                type="button"
                className="text-[10px] text-emerald-400 hover:underline"
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    objectives: [
                      ...p.objectives,
                      {
                        stage: p.objectives.length + 1,
                        type: 'TALK',
                        targetSlug: '',
                        requiredQty: 1,
                        description: '',
                      },
                    ],
                  }))
                }
              >
                + stage
              </button>
            </div>
            {form.objectives.map((o, idx) => (
              <div key={idx} className="border border-slate-800 rounded-lg p-2 space-y-1.5 bg-[#0b1320]/40">
                <div className="grid grid-cols-4 gap-1.5">
                  <div>
                    <label className={labelCls}>Stage</label>
                    <input
                      type="number"
                      className={inputCls}
                      value={o.stage}
                      onChange={(e) => setObj(idx, { stage: parseInt(e.target.value, 10) || 1 })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Type</label>
                    <select
                      className={inputCls}
                      value={o.type}
                      onChange={(e) => setObj(idx, { type: e.target.value })}
                    >
                      {['TALK', 'CLAIM', 'BATTLE', 'GATHER', 'KILL', 'EXPLORE'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Target</label>
                    <input
                      className={inputCls}
                      value={o.targetSlug}
                      onChange={(e) => setObj(idx, { targetSlug: e.target.value })}
                    />
                  </div>
                </div>
                <input
                  className={inputCls}
                  placeholder="Description"
                  value={o.description}
                  onChange={(e) => setObj(idx, { description: e.target.value })}
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleSave()}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-700/30 border border-amber-600/40 text-amber-100 font-bold uppercase tracking-wider text-[10px] hover:bg-amber-700/50 disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5" />
              {loading ? 'Saving…' : 'Save'}
            </button>
            {!isNew && form.slug && (
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleDelete()}
                className="px-3 py-2 rounded-lg border border-red-800/50 text-red-300 hover:bg-red-900/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
