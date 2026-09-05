'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  listQuestTemplates,
  upsertQuestTemplate,
  deleteQuestTemplate,
  type QuestObjectiveInput,
} from '@/app/actions/game/quest-templates';
import { useEditorStore } from '../editor-store';
import { CatalogEditorShell } from '../components/CatalogEditorShell';
import { RegistryCombobox } from '../components/RegistryCombobox';
import { definitionOpValue } from '@/shared/game/definitionOps';
import { getAllCreatureDefs } from '@/app/actions/game/creature-defs';
import {
  Plus, Trash2, Save, RefreshCw, CheckCircle2, AlertCircle, LayoutTemplate, Play, ArrowRight
} from 'lucide-react';

const inputCls =
  'w-full bg-[#050b14] border border-[#806f47]/20 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 font-mono outline-none focus:border-amber-700 transition-colors';
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
  const [creatures, setCreatures] = useState<Array<{ slug: string; name: string }>>([]);
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
    const [res, creaturesRes] = await Promise.all([
      listQuestTemplates(activeGameId),
      getAllCreatureDefs(activeGameId)
    ]);
    if (res.success) setList(res.data as QuestRow[]);
    if (creaturesRes.success) setCreatures(creaturesRes.data);
  }, [activeGameId]);

  useEffect(() => {
    void load();
    clearDefinitionStackFor('quest:new');
    setForm(emptyQuest(activeGameId));
    setIsNew(false);
  }, [load, activeGameId, clearDefinitionStackFor]);

  useEffect(() => {
    const handleFocus = async (e: Event) => {
      const customEv = e as CustomEvent<{ questSlug: string; npcId?: string; npcName?: string }>;
      const targetSlug = customEv.detail?.questSlug;
      if (!targetSlug) return;
      setLoading(true);
      const res = await listQuestTemplates(activeGameId);
      setLoading(false);
      if (res.success && res.data) {
        const rows = res.data as QuestRow[];
        setList(rows);
        const match = rows.find((q) => q.slug === targetSlug);
        if (match) {
          clearDefinitionStackFor(questResourceKey(formRef.current, isNewRef.current));
          setForm({
            ...match,
            rewards: (() => {
              try {
                return JSON.stringify(JSON.parse(match.rewards), null, 2);
              } catch {
                return match.rewards;
              }
            })(),
          });
          setIsNew(false);
        } else {
          clearDefinitionStackFor('quest:new');
          const serapht: QuestForm = {
            ...emptyQuest(activeGameId),
            slug: targetSlug,
            title: customEv.detail?.npcName ? `Quest: ${customEv.detail.npcName}` : targetSlug,
            objectives: customEv.detail?.npcId
              ? [
                  {
                    stage: 1,
                    type: 'TALK',
                    targetSlug: customEv.detail.npcId,
                    requiredQty: 1,
                    description: `Speak to ${customEv.detail.npcName || customEv.detail.npcId}`,
                  },
                ]
              : [
                  { stage: 1, type: 'TALK', targetSlug: 'npc_', requiredQty: 1, description: '' },
                ],
          };
          setForm(serapht);
          setIsNew(true);
        }
      }
    };
    window.addEventListener('studio_focus_quest', handleFocus);
    return () => window.removeEventListener('studio_focus_quest', handleFocus);
  }, [activeGameId, clearDefinitionStackFor]);

  const showStatus = (type: 'success' | 'error', msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 3500);
  };

  const commitFormChange = (serapht: QuestForm, key = questResourceKey(formRef.current, isNewRef.current)) => {
    recordDefinitionChange(key, formRef.current, serapht);
    setForm(serapht);
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

  const handleTemplate = () => {
    const prevKey = questResourceKey(formRef.current, isNewRef.current);
    clearDefinitionStackFor(prevKey);
    setForm({
      slug: 'fetch_wood_starter',
      gameId: activeGameId,
      title: 'Wood for the Fire',
      description: 'The campfire is running low. Gather some wood logs from the nearby forest.',
      levelReq: 1,
      isRepeatable: false,
      rewards: JSON.stringify({ items: [{ slug: 'gold_coin', qty: 50 }], xp: 100 }, null, 2),
      objectives: [
        { stage: 1, type: 'GATHER', targetSlug: 'wood_log', requiredQty: 5, description: 'Gather 5 Wood Logs' },
        { stage: 2, type: 'TALK', targetSlug: 'npc_marshal_vance', requiredQty: 1, description: 'Return to Marshal Vance' }
      ],
    });
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
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => void load()} className="rounded p-1.5 text-slate-400 hover:bg-white/5" title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={handleNew} className="rounded p-1.5 text-emerald-400 hover:bg-white/5" title="New quest">
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={handleTemplate} className="rounded p-1.5 text-blue-400 hover:bg-white/5" title="Load Starter Template">
            <LayoutTemplate className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              useEditorStore.getState().enterPlaytest();
              showStatus('success', `Playtesting quest: ${form.title || form.slug}`);
            }}
            className="flex items-center gap-1 rounded bg-gradient-to-r from-emerald-600 to-teal-600 px-2 py-1 text-[10px] font-bold text-white shadow hover:from-emerald-500 hover:to-teal-500 transition-all cursor-pointer ml-1"
            title="Launch playtest mode to test this quest"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>Test Quest</span>
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

      {/* Visual Objective Stage Chain Flow (Phase 8 Track E4) */}
      {form.objectives.length > 0 && (
        <div className="mb-3 p-2 rounded-lg border border-amber-500/30 bg-[#050b14]/80 space-y-1">
          <div className="text-[9px] font-black text-[#cbb26a] uppercase tracking-wider flex items-center justify-between">
            <span>Objective Flow Chain ({form.objectives.length} Stages)</span>
            <span className="text-slate-500 font-mono text-[8px]">Auto-sequenced</span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar py-1">
            {form.objectives.map((obj, idx) => (
              <React.Fragment key={idx}>
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-[#0b1320] border border-[#806f47]/30/80 text-[10px] shrink-0 font-mono">
                  <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-[9px]">
                    {obj.stage || idx + 1}
                  </span>
                  <span className="font-bold text-slate-200">{obj.type}</span>
                  {obj.targetSlug && (
                    <span className="text-slate-400 text-[9px] max-w-[80px] truncate font-normal">
                      {obj.targetSlug}
                    </span>
                  )}
                  {obj.requiredQty > 1 && (
                    <span className="text-cyan-400 text-[9px] font-bold">×{obj.requiredQty}</span>
                  )}
                </div>
                {idx < form.objectives.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-amber-500/50 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
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
              <div key={idx} className="border border-[#806f47]/20 rounded-lg p-2 space-y-1.5 bg-[#0b1320]/40">
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
                    <RegistryCombobox
                      className="w-full"
                      value={o.targetSlug}
                      options={
                        creatures.map(c => ({ value: c.slug, label: `${c.name} (${c.slug})` }))
                      }
                      onChange={(val) =>
                        setForm((prev) => ({
                          ...prev,
                          objectives: prev.objectives.map((obj, i) =>
                            i === idx ? { ...obj, targetSlug: val } : obj
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
