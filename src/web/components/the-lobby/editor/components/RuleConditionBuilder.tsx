'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Code, Eye, Layers } from 'lucide-react';
import type {
  ConditionDefinition,
  SingleConditionDefinition,
  CompoundConditionDefinition,
  ActionDefinition,
  ComparisonOperator,
} from '@/shared/game/rules/ruleEngine';

interface RuleConditionBuilderProps {
  /** The current condition object or JSON string. */
  value?: ConditionDefinition | string;
  /** Callback fired when condition changes, passing both object and JSON string. */
  onChange: (condition: ConditionDefinition, jsonString: string) => void;
  /** Optional title label. */
  label?: string;
  /** Allow raw JSON view mode. */
  allowJsonToggle?: boolean;
}

const COMPARISON_OPS: ComparisonOperator[] = ['GTE', 'GT', 'EQ', 'LTE', 'LT', 'NEQ'];

const DEFAULT_SINGLE_CONDITION: SingleConditionDefinition = {
  kind: 'PLAYER_LEVEL',
  level: 1,
  operator: 'GTE',
};

export const RuleConditionBuilder: React.FC<RuleConditionBuilderProps> = ({
  value,
  onChange,
  label = 'Requirement Condition',
  allowJsonToggle = true,
}) => {
  const [showRawJson, setShowRawJson] = useState(false);

  // Normalize initial value
  const parsedValue: ConditionDefinition = React.useMemo(() => {
    if (!value) return DEFAULT_SINGLE_CONDITION;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return DEFAULT_SINGLE_CONDITION;
      }
    }
    return value;
  }, [value]);

  const updateCondition = (newCond: ConditionDefinition) => {
    onChange(newCond, JSON.stringify(newCond, null, 2));
  };

  const handleKindChange = (kind: SingleConditionDefinition['kind']) => {
    switch (kind) {
      case 'PLAYER_ITEM':
        updateCondition({ kind: 'PLAYER_ITEM', itemId: 'item_slug', amount: 1, operator: 'GTE' });
        break;
      case 'PLAYER_GOLD':
        updateCondition({ kind: 'PLAYER_GOLD', amount: 100, operator: 'GTE' });
        break;
      case 'PLAYER_LEVEL':
        updateCondition({ kind: 'PLAYER_LEVEL', level: 10, operator: 'GTE' });
        break;
      case 'PLAYER_SKILL_LEVEL':
        updateCondition({ kind: 'PLAYER_SKILL_LEVEL', skillId: 'mining', level: 5, operator: 'GTE' });
        break;
      case 'QUEST_STATE':
        updateCondition({ kind: 'QUEST_STATE', questId: 'quest_slug', state: 'COMPLETED' });
        break;
      case 'REPUTATION':
        updateCondition({ kind: 'REPUTATION', factionId: 'saints', value: 500, operator: 'GTE' });
        break;
      case 'WORLD_STATE':
        updateCondition({ kind: 'WORLD_STATE', key: 'global_weather', value: 'night', operator: 'EQ' });
        break;
      case 'TIME_OF_DAY':
        updateCondition({ kind: 'TIME_OF_DAY', timeSlot: 'NIGHT' });
        break;
      case 'CUSTOM':
        updateCondition({ kind: 'CUSTOM', predicateKey: 'custom_flag', expectedValue: true });
        break;
    }
  };

  const convertToCompound = (logic: 'AND' | 'OR') => {
    const compound: CompoundConditionDefinition = {
      kind: 'COMPOUND',
      logic,
      conditions: [parsedValue, DEFAULT_SINGLE_CONDITION],
    };
    updateCondition(compound);
  };

  return (
    <div className="rounded border border-slate-800 bg-[#0a1120] p-3 text-xs font-mono">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
        <span className="font-bold text-slate-300">{label}</span>
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
      </div>

      {showRawJson ? (
        <textarea
          value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onChange(parsed, e.target.value);
            } catch {
              // Allow typing in-progress invalid JSON
            }
          }}
          className="w-full h-32 rounded bg-black/60 p-2 font-mono text-slate-200 border border-slate-800 text-[11px]"
        />
      ) : parsedValue.kind === 'COMPOUND' ? (
        <CompoundConditionEditor
          compound={parsedValue}
          onChange={updateCondition}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <select
              value={parsedValue.kind}
              onChange={(e) => handleKindChange(e.target.value as any)}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200 text-[11px]"
            >
              <option value="PLAYER_LEVEL">Player Level</option>
              <option value="PLAYER_ITEM">Has Item</option>
              <option value="PLAYER_GOLD">Has Gold</option>
              <option value="PLAYER_SKILL_LEVEL">Skill Level</option>
              <option value="QUEST_STATE">Quest State</option>
              <option value="REPUTATION">Faction Reputation</option>
              <option value="WORLD_STATE">World State Key</option>
              <option value="TIME_OF_DAY">Time of Day</option>
              <option value="CUSTOM">Custom Predicate</option>
            </select>

            <button
              type="button"
              onClick={() => convertToCompound('AND')}
              className="flex items-center gap-1 px-2 py-1 rounded bg-blue-900/30 text-blue-300 border border-blue-500/30 hover:bg-blue-900/50 text-[10px]"
              title="Add another condition combined with AND"
            >
              <Layers className="w-3 h-3" />
              <span>+ AND Condition</span>
            </button>
          </div>

          <SingleConditionFields
            condition={parsedValue}
            onChange={updateCondition}
          />
        </div>
      )}
    </div>
  );
};

// ─── Single Condition Editor Fields ──────────────────────────────────

function SingleConditionFields({
  condition,
  onChange,
}: {
  condition: SingleConditionDefinition;
  onChange: (cond: SingleConditionDefinition) => void;
}) {
  switch (condition.kind) {
    case 'PLAYER_LEVEL':
      return (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Operator
            <select
              value={condition.operator || 'GTE'}
              onChange={(e) => onChange({ ...condition, operator: e.target.value as any })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200"
            >
              {COMPARISON_OPS.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Required Level
            <input
              type="number"
              min="1"
              value={condition.level}
              onChange={(e) => onChange({ ...condition, level: parseInt(e.target.value) || 1 })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200"
            />
          </label>
        </div>
      );

    case 'PLAYER_ITEM':
      return (
        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1 text-[10px] text-slate-400 col-span-2">
            Item ID / Slug
            <input
              type="text"
              value={condition.itemId}
              onChange={(e) => onChange({ ...condition, itemId: e.target.value })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200 font-mono"
              placeholder="e.g. iron_sword"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Count
            <input
              type="number"
              min="1"
              value={condition.amount}
              onChange={(e) => onChange({ ...condition, amount: parseInt(e.target.value) || 1 })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200"
            />
          </label>
        </div>
      );

    case 'PLAYER_GOLD':
      return (
        <label className="flex flex-col gap-1 text-[10px] text-slate-400">
          Required Gold
          <input
            type="number"
            min="0"
            value={condition.amount}
            onChange={(e) => onChange({ ...condition, amount: parseInt(e.target.value) || 0 })}
            className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200"
          />
        </label>
      );

    case 'PLAYER_SKILL_LEVEL':
      return (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Skill ID
            <input
              type="text"
              value={condition.skillId}
              onChange={(e) => onChange({ ...condition, skillId: e.target.value })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200 font-mono"
              placeholder="e.g. mining"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Required Level
            <input
              type="number"
              min="1"
              value={condition.level}
              onChange={(e) => onChange({ ...condition, level: parseInt(e.target.value) || 1 })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200"
            />
          </label>
        </div>
      );

    case 'QUEST_STATE':
      return (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Quest Slug
            <input
              type="text"
              value={condition.questId}
              onChange={(e) => onChange({ ...condition, questId: e.target.value })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200 font-mono"
              placeholder="e.g. main_quest_01"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Required State
            <select
              value={condition.state}
              onChange={(e) => onChange({ ...condition, state: e.target.value as any })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200"
            >
              <option value="NOT_STARTED">Not Started</option>
              <option value="ACTIVE">Active (In Progress)</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </label>
        </div>
      );

    case 'REPUTATION':
      return (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Faction ID
            <input
              type="text"
              value={condition.factionId}
              onChange={(e) => onChange({ ...condition, factionId: e.target.value })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200 font-mono"
              placeholder="e.g. saints_order"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Min Value
            <input
              type="number"
              value={condition.value}
              onChange={(e) => onChange({ ...condition, value: parseInt(e.target.value) || 0 })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200"
            />
          </label>
        </div>
      );

    case 'WORLD_STATE':
      return (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            State Key
            <input
              type="text"
              value={condition.key}
              onChange={(e) => onChange({ ...condition, key: e.target.value })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200 font-mono"
              placeholder="e.g. global_weather"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Expected Value
            <input
              type="text"
              value={typeof condition.value === 'string' ? condition.value : JSON.stringify(condition.value)}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200 font-mono"
              placeholder="e.g. night"
            />
          </label>
        </div>
      );

    case 'TIME_OF_DAY':
      return (
        <label className="flex flex-col gap-1 text-[10px] text-slate-400">
          Time Slot
          <select
            value={condition.timeSlot}
            onChange={(e) => onChange({ ...condition, timeSlot: e.target.value as any })}
            className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200"
          >
            <option value="DAY">Day</option>
            <option value="DUSK">Dusk</option>
            <option value="NIGHT">Night</option>
            <option value="DAWN">Dawn</option>
          </select>
        </label>
      );

    case 'CUSTOM':
      return (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Predicate Key
            <input
              type="text"
              value={condition.predicateKey}
              onChange={(e) => onChange({ ...condition, predicateKey: e.target.value })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200 font-mono"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Expected Value (JSON)
            <input
              type="text"
              value={typeof condition.expectedValue === 'string' ? condition.expectedValue : JSON.stringify(condition.expectedValue)}
              onChange={(e) => onChange({ ...condition, expectedValue: e.target.value })}
              className="rounded bg-black/50 px-2 py-1 border border-slate-700 text-slate-200 font-mono"
            />
          </label>
        </div>
      );
  }
}

// ─── Compound Condition Editor ───────────────────────────────────────

function CompoundConditionEditor({
  compound,
  onChange,
}: {
  compound: CompoundConditionDefinition;
  onChange: (comp: CompoundConditionDefinition) => void;
}) {
  const addSubCondition = () => {
    onChange({
      ...compound,
      conditions: [...compound.conditions, DEFAULT_SINGLE_CONDITION],
    });
  };

  const removeSubCondition = (index: number) => {
    const updated = compound.conditions.filter((_, i) => i !== index);
    if (updated.length === 1 && updated[0].kind !== 'COMPOUND') {
      // Collapse back to single if 1 left
      onChange(updated[0] as any);
    } else {
      onChange({ ...compound, conditions: updated });
    }
  };

  const updateSubCondition = (index: number, cond: ConditionDefinition) => {
    const updated = [...compound.conditions];
    updated[index] = cond;
    onChange({ ...compound, conditions: updated });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-400">Match Logic:</span>
        <select
          value={compound.logic}
          onChange={(e) => onChange({ ...compound, logic: e.target.value as any })}
          className="rounded bg-black/50 px-2 py-0.5 border border-slate-700 text-blue-300 font-bold text-[11px]"
        >
          <option value="AND">ALL Must Match (AND)</option>
          <option value="OR">ANY Must Match (OR)</option>
          <option value="NOT">NONE Must Match (NOT)</option>
        </select>
        <button
          type="button"
          onClick={addSubCondition}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-900/30 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/50 text-[10px] ml-auto"
        >
          <Plus className="w-3 h-3" />
          <span>Add Condition</span>
        </button>
      </div>

      <div className="space-y-2 border-l-2 border-blue-500/40 pl-3">
        {compound.conditions.map((subCond, i) => (
          <div key={i} className="flex items-start gap-2 rounded bg-black/30 p-2 border border-slate-800">
            <div className="flex-1">
              {subCond.kind === 'COMPOUND' ? (
                <CompoundConditionEditor
                  compound={subCond}
                  onChange={(updated) => updateSubCondition(i, updated)}
                />
              ) : (
                <SingleConditionFields
                  condition={subCond}
                  onChange={(updated) => updateSubCondition(i, updated)}
                />
              )}
            </div>
            {compound.conditions.length > 1 && (
              <button
                type="button"
                onClick={() => removeSubCondition(i)}
                className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
                title="Remove condition"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
