'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  listNpcDialogueTrees,
  getNpcDialogueTree,
  upsertNpcDialogueTree,
  deleteNpcDialogueTree,
  type DialogueNodeInput,
  type DialogueOptionInput,
} from '@/app/actions/npc-dialogue';
import { KNOWN_ACTIONS } from '@/shared/game/dialogueActions';
import { CatalogEditorShell } from '../components/CatalogEditorShell';
import {
  Plus, Trash2, Save, RefreshCw, CheckCircle2, AlertCircle,
} from 'lucide-react';

const inputCls =
  'w-full bg-[#050b14] border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 font-mono outline-none focus:border-sky-700 transition-colors';
const labelCls = 'block text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] mb-1';

function treeToNodes(tree: Record<string, unknown>): DialogueNodeInput[] {
  return Object.entries(tree).map(([id, raw]) => {
    const node = (raw || {}) as {
      text?: string;
      options?: DialogueOptionInput[];
    };
    return {
      id,
      text: node.text || '',
      options: Array.isArray(node.options)
        ? node.options.map((o) => ({
            label: o.label || '',
            nextNode: o.nextNode || 'exit',
            action: o.action || '',
            questSlug: o.questSlug || '',
          }))
        : [],
    };
  });
}

const emptyNodes = (): DialogueNodeInput[] => [
  {
    id: 'node_start',
    text: 'Hello, traveler.',
    options: [{ label: 'Goodbye.', nextNode: 'exit', action: '', questSlug: '' }],
  },
];

export function DialogueEditorPanel() {
  const [list, setList] = useState<Array<{ npcId: string; name: string }>>([]);
  const [filter, setFilter] = useState('');
  const [npcId, setNpcId] = useState('');
  const [name, setName] = useState('');
  const [nodes, setNodes] = useState<DialogueNodeInput[]>(emptyNodes());
  const [rawMode, setRawMode] = useState(false);
  const [rawJson, setRawJson] = useState('{}');
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const loadList = useCallback(async () => {
    const res = await listNpcDialogueTrees(filter);
    if (res.success) setList(res.data);
  }, [filter]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const showStatus = (type: 'success' | 'error', msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 3500);
  };

  const handleSelect = async (id: string) => {
    setLoading(true);
    const res = await getNpcDialogueTree(id);
    setLoading(false);
    if (!res.success || !res.data) {
      showStatus('error', res.error || 'Load failed');
      return;
    }
    setNpcId(res.data.npcId);
    setName(res.data.name);
    setNodes(treeToNodes(res.data.tree));
    setRawJson(JSON.stringify(res.data.tree, null, 2));
    setIsNew(false);
  };

  const handleNew = () => {
    setNpcId('npc_');
    setName('New NPC');
    setNodes(emptyNodes());
    setRawJson(JSON.stringify({ node_start: emptyNodes()[0] }, null, 2));
    setIsNew(true);
  };

  const handleSave = async () => {
    if (!npcId.trim()) {
      showStatus('error', 'npcId required');
      return;
    }
    setLoading(true);
    const res = await upsertNpcDialogueTree(
      rawMode
        ? { npcId, name, rawJson }
        : { npcId, name, nodes }
    );
    setLoading(false);
    if (res.success) {
      showStatus('success', `Saved ${npcId}`);
      setIsNew(false);
      await loadList();
    } else {
      showStatus('error', res.error || 'Save failed');
    }
  };

  const handleDelete = async () => {
    if (!npcId || isNew) return;
    if (!confirm(`Delete dialogue for ${npcId}?`)) return;
    setLoading(true);
    const res = await deleteNpcDialogueTree(npcId);
    setLoading(false);
    if (res.success) {
      showStatus('success', 'Deleted');
      setNpcId('');
      setNodes(emptyNodes());
      await loadList();
    } else {
      showStatus('error', res.error || 'Delete failed');
    }
  };

  const updateNode = (idx: number, patch: Partial<DialogueNodeInput>) => {
    setNodes((prev) => prev.map((n, i) => (i === idx ? { ...n, ...patch } : n)));
  };

  const updateOption = (
    nodeIdx: number,
    optIdx: number,
    patch: Partial<DialogueOptionInput>
  ) => {
    setNodes((prev) =>
      prev.map((n, i) => {
        if (i !== nodeIdx) return n;
        const options = n.options.map((o, j) => (j === optIdx ? { ...o, ...patch } : o));
        return { ...n, options };
      })
    );
  };

  return (
    <CatalogEditorShell
      title="Dialogue Catalog"
      blurb="Script mode · NpcDialogueTree SoT · nodes or raw JSON"
      dirty={isNew}
      toolbar={
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => void loadList()}
            className="rounded p-1.5 text-slate-400 hover:bg-white/5"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNew}
            className="rounded p-1.5 text-sky-400 hover:bg-white/5"
            title="New dialogue"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      }
      list={
        <div className="flex flex-col gap-2">
          <input
            className={inputCls}
            placeholder="Filter npcId…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <div className="space-y-1">
            {list.map((row) => (
              <button
                key={row.npcId}
                type="button"
                onClick={() => void handleSelect(row.npcId)}
                className={`w-full rounded border px-2 py-1.5 text-left transition-colors ${
                  row.npcId === npcId
                    ? 'border-sky-600/50 bg-sky-950/40 text-sky-200'
                    : 'border-transparent text-slate-400 hover:bg-white/5'
                }`}
              >
                <div className="truncate font-mono text-[11px]">{row.npcId}</div>
                <div className="truncate text-[9px] text-slate-600">{row.name}</div>
              </button>
            ))}
            {list.length === 0 && (
              <p className="p-2 text-[10px] text-slate-500">No dialogue trees.</p>
            )}
          </div>
        </div>
      }
    >
      {status && (
        <div
          className={`mb-2 flex items-center gap-1.5 rounded px-2 py-1 text-[10px] ${
            status.type === 'success'
              ? 'bg-emerald-900/40 text-emerald-300'
              : 'bg-red-900/40 text-red-300'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <AlertCircle className="h-3 w-3" />
          )}
          {status.msg}
        </div>
      )}

      <div className="flex flex-col gap-2 pr-1">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>npcId</label>
              <input
                className={inputCls}
                value={npcId}
                disabled={!isNew && !!npcId}
                onChange={(e) => setNpcId(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Display name</label>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRawMode(false)}
              className={`text-[9px] font-bold uppercase px-2 py-1 rounded-lg border ${
                !rawMode ? 'border-sky-700 text-sky-300' : 'border-slate-800 text-slate-500'
              }`}
            >
              Nodes
            </button>
            <button
              type="button"
              onClick={() => {
                if (!rawMode) {
                  const tree: Record<string, unknown> = {};
                  for (const n of nodes) {
                    tree[n.id] = {
                      text: n.text,
                      options: n.options.map((o) => {
                        const opt: Record<string, string> = {
                          label: o.label,
                          nextNode: o.nextNode,
                        };
                        if (o.action) opt.action = o.action;
                        if (o.questSlug) opt.questSlug = o.questSlug;
                        return opt;
                      }),
                    };
                  }
                  setRawJson(JSON.stringify(tree, null, 2));
                }
                setRawMode(true);
              }}
              className={`text-[9px] font-bold uppercase px-2 py-1 rounded-lg border ${
                rawMode ? 'border-sky-700 text-sky-300' : 'border-slate-800 text-slate-500'
              }`}
            >
              Raw JSON
            </button>
          </div>

          {rawMode ? (
            <textarea
              className={`${inputCls} min-h-[280px] font-mono text-[10px]`}
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
            />
          ) : (
            <div className="space-y-3">
              {nodes.map((node, ni) => (
                <div
                  key={`${node.id}-${ni}`}
                  className="rounded-xl border border-slate-800 bg-[#080e18] p-2.5 space-y-2"
                >
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className={labelCls}>Node id</label>
                      <input
                        className={inputCls}
                        value={node.id}
                        onChange={(e) => updateNode(ni, { id: e.target.value })}
                      />
                    </div>
                    <button
                      type="button"
                      className="self-end p-2 text-red-400/80 hover:bg-red-950/30 rounded-lg"
                      onClick={() => setNodes((prev) => prev.filter((_, i) => i !== ni))}
                      title="Remove node"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <label className={labelCls}>Text</label>
                    <textarea
                      className={`${inputCls} min-h-[56px]`}
                      value={node.text}
                      onChange={(e) => updateNode(ni, { text: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelCls}>Options</label>
                    {node.options.map((opt, oi) => (
                      <div
                        key={oi}
                        className="grid grid-cols-2 gap-1.5 p-2 rounded-lg border border-slate-900 bg-black/20"
                      >
                        <input
                          className={inputCls}
                          placeholder="Label"
                          value={opt.label}
                          onChange={(e) => updateOption(ni, oi, { label: e.target.value })}
                        />
                        <input
                          className={inputCls}
                          placeholder="nextNode"
                          value={opt.nextNode}
                          onChange={(e) => updateOption(ni, oi, { nextNode: e.target.value })}
                        />
                        <select
                          className={inputCls}
                          value={opt.action || ''}
                          onChange={(e) => updateOption(ni, oi, { action: e.target.value })}
                        >
                          {KNOWN_ACTIONS.map((a) => (
                            <option key={a || 'none'} value={a}>
                              {a || '(no action)'}
                            </option>
                          ))}
                        </select>
                        <input
                          className={inputCls}
                          placeholder="questSlug (ACCEPT_QUEST)"
                          value={opt.questSlug || ''}
                          onChange={(e) => updateOption(ni, oi, { questSlug: e.target.value })}
                        />
                        <button
                          type="button"
                          className="col-span-2 text-[9px] text-red-400/70 text-left"
                          onClick={() =>
                            updateNode(ni, {
                              options: node.options.filter((_, j) => j !== oi),
                            })
                          }
                        >
                          Remove option
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="text-[9px] font-bold uppercase text-sky-400/80"
                      onClick={() =>
                        updateNode(ni, {
                          options: [
                            ...node.options,
                            { label: '…', nextNode: 'exit', action: '', questSlug: '' },
                          ],
                        })
                      }
                    >
                      + Option
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="text-[10px] font-bold uppercase text-sky-300"
                onClick={() =>
                  setNodes((prev) => [
                    ...prev,
                    {
                      id: `node_${prev.length + 1}`,
                      text: '',
                      options: [{ label: 'Back', nextNode: 'node_start', action: '', questSlug: '' }],
                    },
                  ])
                }
              >
                + Node
              </button>
            </div>
          )}

          <div className="flex gap-2 sticky bottom-0 bg-[#0a1018]/95 py-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleSave()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-900/40 border border-sky-800/50 text-sky-200 text-[10px] font-bold uppercase disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5" /> Save
            </button>
            <button
              type="button"
              disabled={loading || isNew}
              onClick={() => void handleDelete()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-900/40 text-red-300/80 text-[10px] font-bold uppercase disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
      </div>
    </CatalogEditorShell>
  );
}
