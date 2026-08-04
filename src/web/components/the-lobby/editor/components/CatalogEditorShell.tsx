'use client';

import React from 'react';

export type CatalogEditorShellProps = {
  /** Catalog title (e.g. Creatures, NPCs). */
  title: string;
  /** One-line purpose. */
  blurb?: string;
  dirty?: boolean;
  /** Optional actions: Seed, Import, New… */
  toolbar?: React.ReactNode;
  /** Optional left list column. */
  list?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Shared chrome for definition catalogs (bible 30 CatalogEditorShell).
 * Editors configure this shell — they do not invent a second layout.
 */
export function CatalogEditorShell({
  title,
  blurb,
  dirty,
  toolbar,
  list,
  children,
}: CatalogEditorShellProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 font-mono text-xs text-slate-200">
      <header className="shrink-0 space-y-1.5 border-b border-[#806f47]/30 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#cbb26a]">
            {title}
          </h3>
          {dirty && (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200">
              Unsaved
            </span>
          )}
        </div>
        {blurb && (
          <p className="text-[10px] leading-relaxed text-slate-500">{blurb}</p>
        )}
        {toolbar && <div className="flex flex-wrap items-center gap-1.5">{toolbar}</div>}
      </header>

      <div className={`flex min-h-0 flex-1 gap-2 ${list ? 'flex-row' : 'flex-col'}`}>
        {list && (
          <aside className="max-h-[40vh] w-[42%] shrink-0 overflow-auto rounded-lg border border-slate-800 bg-black/30 p-1.5 lg:max-h-none">
            {list}
          </aside>
        )}
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
