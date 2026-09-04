'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink, Link2 } from 'lucide-react';
import { getReferencesFor } from '@/app/actions/studio/cross-references';
import {
  type DefinitionType,
  type ReferenceReport,
  type CrossReference,
  DEFINITION_TYPE_LABELS,
} from '@/shared/game/definitionRegistry';

interface DefinitionRefBadgeProps {
  /** The type of the definition being inspected. */
  type: DefinitionType;
  /** The slug of the definition being inspected. */
  slug: string;
  /** Optional callback when a reference is clicked (to open the relevant Studio). */
  onNavigate?: (type: DefinitionType, slug: string) => void;
}

/**
 * Shows "Used by N items" / "References N items" badges for a definition.
 * Loads cross-references on mount and displays grouped inbound/outbound counts.
 */
export function DefinitionRefBadge({ type, slug, onNavigate }: DefinitionRefBadgeProps) {
  const [report, setReport] = useState<ReferenceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    getReferencesFor(type, slug).then((r) => {
      if (active) {
        setReport(r);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [type, slug]);

  if (!slug || loading) {
    return null;
  }

  if (!report || (report.inbound.length === 0 && report.outbound.length === 0)) {
    return null;
  }

  // Group inbound by source type
  const inboundByType = new Map<DefinitionType, CrossReference[]>();
  for (const ref of report.inbound) {
    const existing = inboundByType.get(ref.source.type) || [];
    existing.push(ref);
    inboundByType.set(ref.source.type, existing);
  }

  // Group outbound by target type
  const outboundByType = new Map<DefinitionType, CrossReference[]>();
  for (const ref of report.outbound) {
    const existing = outboundByType.get(ref.target.type) || [];
    existing.push(ref);
    outboundByType.set(ref.target.type, existing);
  }

  return (
    <div className="mt-2 space-y-1">
      {/* Summary line */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
      >
        <Link2 className="w-3 h-3" />
        <span>
          {report.inbound.length > 0 && `Used by ${report.inbound.length}`}
          {report.inbound.length > 0 && report.outbound.length > 0 && ' · '}
          {report.outbound.length > 0 && `References ${report.outbound.length}`}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="ml-4 space-y-2 text-[10px]">
          {/* Inbound: who references this definition */}
          {inboundByType.size > 0 && (
            <div>
              <div className="text-slate-500 font-semibold uppercase tracking-wider mb-1">Used By</div>
              {Array.from(inboundByType.entries()).map(([refType, refs]) => (
                <div key={refType} className="flex flex-wrap gap-1 mb-1">
                  <span className="text-slate-400">{DEFINITION_TYPE_LABELS[refType]}:</span>
                  {refs.map((ref, i) => (
                    <button
                      key={i}
                      onClick={() => onNavigate?.(ref.source.type, ref.source.slug)}
                      className="px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-500/20 hover:bg-blue-900/50 transition-colors flex items-center gap-1"
                    >
                      {ref.source.slug}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Outbound: what this definition references */}
          {outboundByType.size > 0 && (
            <div>
              <div className="text-slate-500 font-semibold uppercase tracking-wider mb-1">References</div>
              {Array.from(outboundByType.entries()).map(([refType, refs]) => (
                <div key={refType} className="flex flex-wrap gap-1 mb-1">
                  <span className="text-slate-400">{DEFINITION_TYPE_LABELS[refType]}:</span>
                  {refs.map((ref, i) => (
                    <button
                      key={i}
                      onClick={() => onNavigate?.(ref.target.type, ref.target.slug)}
                      className="px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-900/50 transition-colors flex items-center gap-1"
                    >
                      {ref.target.slug}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
