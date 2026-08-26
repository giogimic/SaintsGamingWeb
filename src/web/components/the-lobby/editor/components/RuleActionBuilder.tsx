'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Code, Eye, Zap } from 'lucide-react';
import type { ActionDefinition } from '@/shared/game/rules/ruleEngine';

interface RuleActionBuilderProps {
  /** The current actions array or JSON string. */
  value?: ActionDefinition[] | string;
  /** Callback fired when actions change, passing both array and JSON string. */
  onChange: (actions: ActionDefinition[], jsonString: string) => void;
  /** Optional title label. */
  label?: string;
  /** Allow raw JSON view mode. */
  allowJsonToggle?: boolean;
}

const DEFAULT_ACTION: ActionDefinition = {
  kind: 'GIVE_ITEM',
  itemId: 'iron_sword',
  quantity: 1,
};

export const RuleActionBuilder: React.FC<RuleActionBuilderProps> = ({
  value,
  onChange,
  label = 'Consequences & Rewards (Actions)',
  allowJsonToggle = true,
}) => {
  const [showRawJson, setShowRawJson] = useState(false);

  // Normalize initial value
  const parsedActions: ActionDefinition[] = React.useMemo(() => {
    if (!value) return [];
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [];
      }
    }
    return Array.isArray(value) ? value : [value];
  }, [value]);

  const updateActions = (newActions: ActionDefinition[]) => {
    onChange(newActions, JSON.stringify(newActions, null, 2));
  };

  const addAction = () => {
    updateActions([...parsedActions, DEFAULT_ACTION]);
  };

  const removeAction = (index: number) => {
    updateActions(parsedActions.filter((_, i) => i !== index));
  };

  const updateActionAt = (index: number, act: ActionDefinition) => {
    const updated = [...parsedActions];
    updated[index] = act;
    updateActions(updated);
  };

  return (
    <div className="rounded border border-slate-800 bg-[#0a1120] p-3 text-xs font-mono">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
        <span className="font-bold text-slate-300">{label}</span>
        <div className="flex items-center gap-2">
          {allowJsonToggle && (
            <button
              type="button"
              onClick={() => setShowRawJson(!showRawJson)}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
            >
              {showRawJson ? <Eye className="w-3 h-3 text-cyan-400" /> : <Code className="w-3 h-3 text-amber-400" />}
              <span>{showRawJson ? 'Visual View' : 'JSON View'}</span>
            </button>
          )}
          {!showRawJson && (
            <button
              type="button"
              onClick={addAction}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-900/30 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/50 text-[10px]"
            >
              <Plus className="w-3 h-3" />
              <span>Add Action</span>
            </button>
          )}
        </div>
      </div>

      {showRawJson ? (
        <textarea
          value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onChange(Array.isArray(parsed) ? parsed : [parsed], e.target.value);
            } catch {
              // Allow raw typing
            }
          }}
          className="w-full h-32 rounded bg-black/60 p-2 font-mono text-slate-200 border border-slate-800 text-[11px]"
        />
      ) : parsedActions.length === 0 ? (
        <div className="text-center py-4 text-slate-500 italic text-[11px]">
          No actions configured. Click &quot;Add Action&quot; to define rewards or outcomes.
        </div>
      ) : (
        <div className="space-y-2">
          {parsedActions.map((action, i) => (
            <div key={i} className="flex items-start gap-2 rounded bg-black/40 p-2 border border-slate-800">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Action #{i + 1}:
                  </span>
                  <select
                    value={action.kind}
                    onChange={(e) => {
                      const kind = e.target.value as ActionDefinition['kind'];
                      switch (kind) {
                        case 'GIVE_ITEM':
                          updateActionAt(i, { kind: 'GIVE_ITEM', itemId: 'item_slug', quantity: 1 });
                          break;
                        case 'REMOVE_ITEM':
                          updateActionAt(i, { kind: 'REMOVE_ITEM', itemId: 'item_slug', quantity: 1 });
                          break;
                        case 'GIVE_GOLD':
                          updateActionAt(i, { kind: 'GIVE_GOLD', amount: 100 });
                          break;
                        case 'REMOVE_GOLD':
                          updateActionAt(i, { kind: 'REMOVE_GOLD', amount: 50 });
                          break;
                        case 'GRANT_XP':
                          updateActionAt(i, { kind: 'GRANT_XP', amount: 250, skillId: 'combat' });
                          break;
                        case 'SET_QUEST_STATE':
                          updateActionAt(i, { kind: 'SET_QUEST_STATE', questId: 'quest_slug', action: 'START' });
                          break;
                        case 'MODIFY_REPUTATION':
                          updateActionAt(i, { kind: 'MODIFY_REPUTATION', factionId: 'saints_order', delta: 50 });
                          break;
                        case 'TRIGGER_WORLD_EVENT':
                          updateActionAt(i, { kind: 'TRIGGER_WORLD_EVENT', eventId: 'event_slug', durationSeconds: 3600 });
                          break;
                        case 'SET_WORLD_STATE':
                          updateActionAt(i, { kind: 'SET_WORLD_STATE', key: 'global_state_key', value: true });
                          break;
                        case 'SEND_NOTIFICATION':
                          updateActionAt(i, { kind: 'SEND_NOTIFICATION', title: 'Notice', message: 'You received a reward!', type: 'SUCCESS' });
                          break;
                        case 'SPAWN_ENTITY':
                          updateActionAt(i, { kind: 'SPAWN_ENTITY', entityId: 'entity_slug', entityType: 'MONSTER', mapId: 'DEMO_SANDBOX', x: 0, y: 0 });
                          break;
                        case 'TELEPORT_PLAYER':
                          updateActionAt(i, { kind: 'TELEPORT_PLAYER', mapId: 'DEMO_SANDBOX', x: 10, y: 10 });
                          break;
                      }
                    }}
                    className="rounded bg-black/50 px-2 py-0.5 border border-slate-700 text-slate-200 text-[10px]"
                  >
                    <option value="GIVE_ITEM">Give Item</option>
                    <option value="REMOVE_ITEM">Remove Item</option>
                    <option value="GIVE_GOLD">Give Gold</option>
                    <option value="REMOVE_GOLD">Remove Gold</option>
                    <option value="GRANT_XP">Grant XP</option>
                    <option value="SET_QUEST_STATE">Set Quest State</option>
                    <option value="MODIFY_REPUTATION">Modify Reputation</option>
                    <option value="TRIGGER_WORLD_EVENT">Trigger World Event</option>
                    <option value="SET_WORLD_STATE">Set World State</option>
                    <option value="SEND_NOTIFICATION">Send Notification</option>
                    <option value="SPAWN_ENTITY">Spawn Entity</option>
                    <option value="TELEPORT_PLAYER">Teleport Player</option>
                  </select>
                </div>

                <ActionFields action={action} onChange={(updated) => updateActionAt(i, updated)} />
              </div>

              <button
                type="button"
                onClick={() => removeAction(i)}
                className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
                title="Remove action"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Single Action Fields ────────────────────────────────────────────

function ActionFields({
  action,
  onChange,
}: {
  action: ActionDefinition;
  onChange: (act: ActionDefinition) => void;
}) {
  switch (action.kind) {
    case 'GIVE_ITEM':
    case 'REMOVE_ITEM':
      return (
        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1 text-[10px] text-slate-400 col-span-2">
            Item Slug
            <input
              type="text"
              value={action.itemId}
              onChange={(e) => onChange({ ...action, itemId: e.target.value })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200 font-mono"
              placeholder="e.g. potion_heal"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Quantity
            <input
              type="number"
              min="1"
              value={action.quantity}
              onChange={(e) => onChange({ ...action, quantity: parseInt(e.target.value) || 1 })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200"
            />
          </label>
        </div>
      );

    case 'GIVE_GOLD':
    case 'REMOVE_GOLD':
      return (
        <label className="flex flex-col gap-1 text-[10px] text-slate-400">
          Gold Amount
          <input
            type="number"
            min="1"
            value={action.amount}
            onChange={(e) => onChange({ ...action, amount: parseInt(e.target.value) || 0 })}
            className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200"
          />
        </label>
      );

    case 'GRANT_XP':
      return (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            XP Amount
            <input
              type="number"
              min="1"
              value={action.amount}
              onChange={(e) => onChange({ ...action, amount: parseInt(e.target.value) || 1 })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Skill ID (Optional)
            <input
              type="text"
              value={action.skillId || ''}
              onChange={(e) => onChange({ ...action, skillId: e.target.value || undefined })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200 font-mono"
              placeholder="Leave empty for character XP"
            />
          </label>
        </div>
      );

    case 'SET_QUEST_STATE':
      return (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Quest Slug
            <input
              type="text"
              value={action.questId}
              onChange={(e) => onChange({ ...action, questId: e.target.value })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200 font-mono"
              placeholder="e.g. main_quest_01"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Action
            <select
              value={action.action}
              onChange={(e) => onChange({ ...action, action: e.target.value as any })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200"
            >
              <option value="START">Start Quest</option>
              <option value="ADVANCE_STAGE">Advance Stage</option>
              <option value="COMPLETE">Complete Quest</option>
            </select>
          </label>
        </div>
      );

    case 'MODIFY_REPUTATION':
      return (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Faction ID
            <input
              type="text"
              value={action.factionId}
              onChange={(e) => onChange({ ...action, factionId: e.target.value })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200 font-mono"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Delta (+/-)
            <input
              type="number"
              value={action.delta}
              onChange={(e) => onChange({ ...action, delta: parseInt(e.target.value) || 0 })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200"
            />
          </label>
        </div>
      );

    case 'TRIGGER_WORLD_EVENT':
      return (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Event Slug
            <input
              type="text"
              value={action.eventId}
              onChange={(e) => onChange({ ...action, eventId: e.target.value })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200 font-mono"
              placeholder="e.g. nightfall"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Duration (sec)
            <input
              type="number"
              value={action.durationSeconds || 0}
              onChange={(e) => onChange({ ...action, durationSeconds: parseInt(e.target.value) || undefined })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200"
            />
          </label>
        </div>
      );

    case 'SET_WORLD_STATE':
      return (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            State Key
            <input
              type="text"
              value={action.key}
              onChange={(e) => onChange({ ...action, key: e.target.value })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200 font-mono"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Value
            <input
              type="text"
              value={typeof action.value === 'string' ? action.value : JSON.stringify(action.value)}
              onChange={(e) => onChange({ ...action, value: e.target.value })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200 font-mono"
            />
          </label>
        </div>
      );

    case 'SEND_NOTIFICATION':
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-[10px] text-slate-400">
              Title
              <input
                type="text"
                value={action.title}
                onChange={(e) => onChange({ ...action, title: e.target.value })}
                className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200"
              />
            </label>
            <label className="flex flex-col gap-1 text-[10px] text-slate-400">
              Type
              <select
                value={action.type || 'INFO'}
                onChange={(e) => onChange({ ...action, type: e.target.value as any })}
                className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200"
              >
                <option value="INFO">Info</option>
                <option value="SUCCESS">Success</option>
                <option value="WARNING">Warning</option>
                <option value="ERROR">Error</option>
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Message
            <input
              type="text"
              value={action.message}
              onChange={(e) => onChange({ ...action, message: e.target.value })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200"
            />
          </label>
        </div>
      );

    case 'SPAWN_ENTITY':
      return (
        <div className="grid grid-cols-4 gap-2">
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Entity ID
            <input
              type="text"
              value={action.entityId}
              onChange={(e) => onChange({ ...action, entityId: e.target.value })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200 font-mono"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Type
            <select
              value={action.entityType}
              onChange={(e) => onChange({ ...action, entityType: e.target.value as any })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200"
            >
              <option value="MONSTER">Monster</option>
              <option value="NPC">NPC</option>
              <option value="CREATURE">Creature</option>
              <option value="OBJECT">Object</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            X
            <input
              type="number"
              value={action.x}
              onChange={(e) => onChange({ ...action, x: parseInt(e.target.value) || 0 })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Y
            <input
              type="number"
              value={action.y}
              onChange={(e) => onChange({ ...action, y: parseInt(e.target.value) || 0 })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200"
            />
          </label>
        </div>
      );

    case 'TELEPORT_PLAYER':
      return (
        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Target Map ID
            <input
              type="text"
              value={action.mapId}
              onChange={(e) => onChange({ ...action, mapId: e.target.value })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200 font-mono"
              placeholder="e.g. DEMO_SANDBOX"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            X
            <input
              type="number"
              value={action.x}
              onChange={(e) => onChange({ ...action, x: parseInt(e.target.value) || 0 })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Y
            <input
              type="number"
              value={action.y}
              onChange={(e) => onChange({ ...action, y: parseInt(e.target.value) || 0 })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200"
            />
          </label>
        </div>
      );
  }
}
