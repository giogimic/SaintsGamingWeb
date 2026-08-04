'use client';

import React from 'react';
import type { SchemaField } from '@/shared/game/entitySchemas';
import type { LootRef } from '@/shared/game/lootRefs';
import { parseLootRef } from '@/shared/game/lootRefs';

export type SchemaFieldRendererProps = {
  field: SchemaField;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
  disabled?: boolean;
  /** Optional pool ids for lootRef strategy=pool */
  lootPoolOptions?: Array<{ id: string; name: string }>;
};

const inputClass =
  'w-full rounded-md border border-slate-700 bg-black/40 px-2 py-1.5 font-mono text-[11px] text-slate-100 outline-none focus:border-[#cbb26a]/60';

/**
 * Renders one schema field for Studio property panels (bible 17).
 * Prefer this over hardcoded per-entity forms when adding new systems.
 */
export const SchemaFieldRenderer: React.FC<SchemaFieldRendererProps> = ({
  field,
  value,
  onChange,
  disabled,
  lootPoolOptions = [],
}) => {
  const id = `schema-${field.key}`;

  return (
    <label className="block space-y-1" htmlFor={id}>
      <span className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {field.label}
        </span>
        {field.advanced && (
          <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] text-slate-500">
            ADV
          </span>
        )}
      </span>
      {field.description && (
        <p className="text-[10px] leading-snug text-slate-500">{field.description}</p>
      )}

      {field.type === 'boolean' ? (
        <input
          id={id}
          type="checkbox"
          disabled={disabled}
          checked={Boolean(value)}
          onChange={(e) => onChange(field.key, e.target.checked)}
          className="h-4 w-4 accent-[#cbb26a]"
        />
      ) : field.type === 'number' ? (
        <input
          id={id}
          type="number"
          disabled={disabled}
          className={inputClass}
          min={field.min}
          max={field.max}
          value={value === undefined || value === null ? '' : String(value)}
          onChange={(e) => {
            const n = e.target.value === '' ? null : Number(e.target.value);
            onChange(field.key, n);
          }}
        />
      ) : field.type === 'enum' ? (
        <select
          id={id}
          disabled={disabled}
          className={inputClass}
          value={String(value ?? field.defaultValue ?? '')}
          onChange={(e) => onChange(field.key, e.target.value)}
        >
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : field.type === 'lootRef' ? (
        <LootRefEditor
          id={id}
          value={value}
          disabled={disabled}
          poolOptions={lootPoolOptions}
          onChange={(next) => onChange(field.key, next)}
        />
      ) : field.type === 'json' ? (
        <textarea
          id={id}
          disabled={disabled}
          rows={3}
          className={`${inputClass} resize-y`}
          value={typeof value === 'string' ? value : JSON.stringify(value ?? {}, null, 2)}
          onChange={(e) => {
            try {
              onChange(field.key, JSON.parse(e.target.value));
            } catch {
              onChange(field.key, e.target.value);
            }
          }}
        />
      ) : (
        <input
          id={id}
          type="text"
          disabled={disabled}
          className={inputClass}
          value={value === undefined || value === null ? '' : String(value)}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      )}
    </label>
  );
};

function LootRefEditor({
  id,
  value,
  disabled,
  poolOptions,
  onChange,
}: {
  id: string;
  value: unknown;
  disabled?: boolean;
  poolOptions: Array<{ id: string; name: string }>;
  onChange: (ref: LootRef) => void;
}) {
  const parsed = parseLootRef(value) ?? { strategy: 'pool' as const, poolId: '' };
  const strategy = parsed.strategy;

  return (
    <div className="space-y-2 rounded-md border border-slate-800 bg-black/20 p-2">
      <select
        id={id}
        disabled={disabled}
        className={inputClass}
        value={strategy}
        onChange={(e) => {
          if (e.target.value === 'pool') {
            onChange({ strategy: 'pool', poolId: '' });
          } else {
            onChange({ strategy: 'override', drops: [] });
          }
        }}
      >
        <option value="pool">Global Pool</option>
        <option value="override">Local Override</option>
      </select>

      {strategy === 'pool' ? (
        poolOptions.length > 0 ? (
          <select
            disabled={disabled}
            className={inputClass}
            value={parsed.strategy === 'pool' ? parsed.poolId : ''}
            onChange={(e) => onChange({ strategy: 'pool', poolId: e.target.value })}
          >
            <option value="">Select pool…</option>
            {poolOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            disabled={disabled}
            className={inputClass}
            placeholder="poolId"
            value={parsed.strategy === 'pool' ? parsed.poolId : ''}
            onChange={(e) => onChange({ strategy: 'pool', poolId: e.target.value })}
          />
        )
      ) : (
        <textarea
          disabled={disabled}
          rows={4}
          className={`${inputClass} resize-y`}
          placeholder='[{"itemId":"quest_key","chance":100,"min":1,"max":1}]'
          value={JSON.stringify(parsed.strategy === 'override' ? parsed.drops : [], null, 2)}
          onChange={(e) => {
            try {
              const drops = JSON.parse(e.target.value);
              const next = parseLootRef({ strategy: 'override', drops });
              if (next) onChange(next);
            } catch {
              /* keep typing */
            }
          }}
        />
      )}
    </div>
  );
}

export type SchemaCategoryPanelProps = {
  title: string;
  fields: SchemaField[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  disabled?: boolean;
  lootPoolOptions?: Array<{ id: string; name: string }>;
};

export const SchemaCategoryPanel: React.FC<SchemaCategoryPanelProps> = ({
  title,
  fields,
  values,
  onChange,
  disabled,
  lootPoolOptions,
}) => {
  if (!fields.length) return null;
  return (
    <section className="space-y-3">
      <h4 className="border-b border-slate-800 pb-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#806f47]">
        {title}
      </h4>
      <div className="space-y-3">
        {fields.map((field) => (
          <SchemaFieldRenderer
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={onChange}
            disabled={disabled}
            lootPoolOptions={lootPoolOptions}
          />
        ))}
      </div>
    </section>
  );
};
