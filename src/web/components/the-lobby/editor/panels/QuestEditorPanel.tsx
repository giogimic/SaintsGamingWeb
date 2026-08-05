'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  listQuestTemplates,
  upsertQuestTemplate,
  deleteQuestTemplate,
  type QuestObjectiveInput,
} from '@/app/actions/quest-templates';
import { useEditorStore } from '../editor-store';
import { CatalogEditorShell } from '../components/CatalogEditorShell';
import { definitionOpValue } from '@/shared/game/definitionOps';
import {
  Plus, Trash2, Save, RefreshCw, CheckCircle2, AlertCircle,
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

type QuestForm = Omit<QuestRow, 'id'> & { id?: string };

const emptyQuest = (gameId: string): QuestForm => ({
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

function questResourceKey(form: QuestForm, isNew: boolean): string {
  if (isNew || !form.slug) return 'quest:new';
  return `quest:${form.slug}`;
}

function isQuestForm(value: unknown): value is QuestForm {
  return Boolean(value && typeof value === 'object' && 'slug' in value && 'title' in value);
}

export function QuestEditorPanel() {
  const activeGameId = useEditorStore((s) => s.activeGameId);
  const definitionOpStack = useEditorStore((s) => s.definitionOpStack);
  const recordDefinitionChange = useEditorStore((s) => s.recordDefinitionChange);
  const undoDefinitionChange = useEditorStore((s) => s.undoDefinitionChange);
  const redoDefinitionChange = useEditorStore((s) => s.redoDefinitionChange);
  const clearDefinitionStackFor = useEditorStore((s) => s.clearDefinitionStackFor);

  const [list, setList] = useState<QuestRow[]>([]);
  const [form, setForm] = useState(emptyQuest(activeGameId));
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const formRef = useRef(form);
  const isNewRef = useRef(isNew);
  const fieldBaselineRef = useRef<QuestForm | null>(null);

  formRef.current = form;
  isNewRef.current = isNew;

  const resourceKey = questResourceKey(form, isNew);
  const topUndo = definitionOpStack.undo[definitionOpStack.undo.length - 1];
  const topRedo = definitionOpStack.redo[definitionOpStack.redo.length - 1];
  const canUndoDefinition = topUndo?.resourceKey === resourceKey;
  const canRedoDefinition = topRedo?.resourceKey === resourceKey;

  const load = useCallback(async () => {
    const res = await listQuestTemplates(activeGameId);
    if (res.success) setList(res.data as QuestRow[]);
  }, [activeGameId]);

  useEffect(() => {
    void load();
    clearDefinitionStackFor('quest:new');
    setForm(emptyQuest(activeGameId));
    setIsNew(false);
  }, [load, activeGameId, clearDefinitionStackFor]);

  const showStatus = (type: 'success' | 'error', msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 3500);
  };

  const commitFormChange = (next: QuestForm, key = questResourceKey(formRef.current, isNewRef.current)) => {
    recordDefinitionChange(key, formRef.current, next);
    setForm(next);
  };

  const handleSelect = (q: QuestRow) => {
    const prevKey = questResourceKey(formRef.current, isNewRef.current);
    clearDefinitionStackFor(prevKey);
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
    const prevKey = questResourceKey(formRef.current, isNewRef.current);
    clearDefinitionStackFor(prevKey);
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
      clearDefinitionStackFor(questResourceKey(form, isNew));
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
      clearDefinitionStackFor(questResourceKey(form, false));
      setForm(emptyQuest(activeGameId));
      setIsNew(false);
      await load();
    } else {
      showStatus('error', res.error || 'Delete failed');
    }
  };

  const onFieldFocus = () => {
    fieldBaselineRef.current = structuredClone(formRef.current);
  };

  const onFieldBlur = () => {
    const baseline = fieldBaselineRef.current;
    fieldBaselineRef.current = null;
    if (!baseline) return;
    if (JSON.stringify(baseline) === JSON.stringify(formRef.current)) return;
    recordDefinitionChange(
      questResourceKey(baseline, isNewRef.current),
      baseline,
      formRef.current
    );
  };

  const applyDefinitionHistory = (direction: 'undo' | 'redo') => {
    const top =
      direction === 'undo'
        ? definitionOpStack.undo[definitionOpStack.undo.length - 1]
        : definitionOpStack.redo[definitionOpStack.redo.length - 1];
    if (!top || top.resourceKey !== resourceKey) return;
    const op =
      direction === 'undo' ? undoDefinitionChange() : redoDefinitionChange();
    if (!op) return;
    const value = definitionOpValue(op, direction);
    if (!isQuestForm(value)) return;
    setForm(value);
  };

  return (
    <CatalogEditorShell
      title="Quest Catalog"
      blurb={`Script mode · profile ${activeGameId} · QuestTemplate SoT · definition undo on blur`}
      dirty={isNew || canUndoDefinition}
      canUndoDefinition={canUndoDefinition}
      canRedoDefinition={canRedoDefinition}
      onUndoDefinition={() => applyDefinitionHistory('undo')}
      onRedoDefinition={() => applyDefinitionHistory('redo')}
      toolbar={
        <div className="flex gap-1">
          <button type="button" onClick={() => void load()} className="rounded p-1.5 text-slate-400 hover:bg-white/5" title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={handleNew} className="rounded p-1.5 text-emerald-400 hover:bg-white/5" title="New quest">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      }
      list={
        <div className="space-y-1">
          {list.length === 0 && (
            <p className="p-2 text-[10px] text-slate-500">No quests for this profile. Seed Spyder or create one.</p>
          )}
          {list.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => handleSelect(q)}
              className={`w-full rounded border px-2 py-1.5 text-left transition-colors ${
                form.slug === q.slug && !isNew
                  ? 'border-amber-600/50 bg-amber-900/20 text-amber-100'
                  : 'border-transparent text-slate-300 hover:bg-white/5'
              }`}
            >
              <div className="truncate text-[11px] font-bold">{q.title}</div>
              <div className="truncate text-[9px] text-slate-500">{q.slug}</div>
            </button>
          ))}
        </div>
      }
    >
      {status && (
        <div className={`mb-2 flex items-center gap-1.5 rounded px-2 py-1 text-[10px] ${status.type === 'success' ? 'bg-emerald-900/40 text-emerald-300' : 'bg-red-900/40 text-red-300'}`}>
          {status.type === 'success' ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          {status.msg}
        </div>
      )}

      <div className="space-y-3 pr-1">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Slug</label>
              <input
                className={inputCls}
                value={form.slug}
                disabled={!isNew}
                onFocus={onFieldFocus}
                onBlur={onFieldBlur}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>Title</label>
              <input
                className={inputCls}
                value={form.title}
                onFocus={onFieldFocus}
                onBlur={onFieldBlur}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className={`${inputCls} min-h-[48px]`}
              value={form.description}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelCls}>Rewards JSON</label>
            <textarea
              className={`${inputCls} min-h-[72px] font-mono`}
              value={form.rewards}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
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
                  commitFormChange({
                    ...formRef.current,
                    objectives: [
                      ...formRef.current.objectives,
                      {
                        stage: formRef.current.objectives.length + 1,
                        type: 'TALK',
                        targetSlug: '',
                        requiredQty: 1,
                        description: '',
                      },
                    ],
                  })
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
                      onFocus={onFieldFocus}
                      onBlur={onFieldBlur}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          objectives: prev.objectives.map((obj, i) =>
                            i === idx
                              ? { ...obj, stage: parseInt(e.target.value, 10) || 1 }
                              : obj
                          ),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Type</label>
                    <select
                      className={inputCls}
                      value={o.type}
                      onFocus={onFieldFocus}
                      onBlur={onFieldBlur}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          objectives: prev.objectives.map((obj, i) =>
                            i === idx ? { ...obj, type: e.target.value } : obj
                          ),
                        }))
                      }
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
                      onFocus={onFieldFocus}
                      onBlur={onFieldBlur}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          objectives: prev.objectives.map((obj, i) =>
                            i === idx ? { ...obj, targetSlug: e.target.value } : obj
                          ),
                        }))
                      }
                    />
                  </div>
                </div>
                <input
                  className={inputCls}
                  placeholder="Description"
                  value={o.description}
                  onFocus={onFieldFocus}
                  onBlur={onFieldBlur}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      objectives: prev.objectives.map((obj, i) =>
                        i === idx ? { ...obj, description: e.target.value } : obj
                      ),
                    }))
                  }
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
    </CatalogEditorShell>
  );
}
