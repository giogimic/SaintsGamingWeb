'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Sword,
  Shield,
  Zap,
  Activity,
  Flame,
  Snowflake,
  Heart,
  Biohazard,
  Crosshair,
  Filter,
  Play,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { getAllAbilityDefs, AbilityDef, AbilityDomain, AbilityStyle } from '@/shared/game/combat/abilityRegistry';
import { getAllStatusDefs, StatusDef } from '@/shared/game/combat/statusRegistry';
import { getAllCanonicalSkillDefs, CanonicalSkillDef } from '@/shared/game/skills/skillRegistry';
import { getAllProfessionDefs, ProfessionDef } from '@/shared/game/professions/professionRegistry';
import { simulateCombatScenario, BalanceScenario, BalanceReport } from '@/shared/game/combat/combatBalanceEngine';
import {
  WindowMenuBar,
  WindowMenuDropdown,
  WindowMenuButton,
  WindowMenuTabGroup,
  WindowMenuDivider,
} from '../WindowMenuBar';

type ActiveStudioTab = 'abilities' | 'status' | 'skills' | 'professions' | 'balance';

export default function GameplayStudioPanels() {
  const [activeTab, setActiveTab] = useState<ActiveStudioTab>('abilities');

  // Ability state
  const [abilities] = useState<AbilityDef[]>(getAllAbilityDefs());
  const [selectedAbility, setSelectedAbility] = useState<AbilityDef | null>(abilities[0] || null);
  const [abilityDomainFilter, setAbilityDomainFilter] = useState<string>('all');

  // Status state
  const [statuses] = useState<StatusDef[]>(getAllStatusDefs());
  const [selectedStatus, setSelectedStatus] = useState<StatusDef | null>(statuses[0] || null);

  // Skills state
  const [skills] = useState<CanonicalSkillDef[]>(getAllCanonicalSkillDefs());

  // Professions state
  const [professions] = useState<ProfessionDef[]>(getAllProfessionDefs());

  // Balance Simulator state
  const [simLevel, setSimLevel] = useState<number>(10);
  const [simAbilityId, setSimAbilityId] = useState<string>('strike');
  const [simHp, setSimHp] = useState<number>(200);
  const [simDef, setSimDef] = useState<number>(20);
  const [simReport, setSimReport] = useState<BalanceReport | null>(null);

  const handleRunSimulation = () => {
    const scenario: BalanceScenario = {
      id: 'custom_sim',
      name: 'Studio Balance Test',
      playerLevel: simLevel,
      abilityId: simAbilityId,
      targetMaxHp: simHp,
      targetDef: simDef,
      iterations: 100,
    };
    const report = simulateCombatScenario(scenario);
    setSimReport(report);
  };

  const filteredAbilities = abilities.filter((a) => {
    if (abilityDomainFilter === 'all') return true;
    return a.domain === abilityDomainFilter || a.domain === 'both';
  });

  return (
    <div className="flex flex-col h-full bg-transparent text-slate-200 font-mono text-xs select-none -m-3 mb-0 overflow-hidden">
      {/* ── WINDOW SUB-MENU APP BAR ── */}
      <WindowMenuBar>
        <WindowMenuTabGroup
          tabs={[
            { id: 'abilities', label: `Abilities (${abilities.length})` },
            { id: 'status', label: `Status (${statuses.length})` },
            { id: 'skills', label: `Skills (${skills.length})` },
            { id: 'professions', label: `Professions (${professions.length})` },
            { id: 'balance', label: 'Combat Sim' },
          ]}
          activeTab={activeTab}
          onChange={(t) => setActiveTab(t as any)}
        />
        {activeTab === 'balance' && (
          <>
            <WindowMenuDivider />
            <WindowMenuButton
              label="Run Sim"
              icon={Play}
              onClick={handleRunSimulation}
              title="Run combat balance simulation"
            />
          </>
        )}
        <div className="flex-1" />
        <span className="text-[9px] text-muted-foreground font-mono">
          Gameplay Systems Engine
        </span>
      </WindowMenuBar>

      {/* Content Area */}
      <div className="flex-1 p-3 overflow-y-auto">
        {/* ABILITIES DOCK */}
        {activeTab === 'abilities' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 h-full">
            {/* List */}
            <div className="border border-[#806f47]/20 rounded-xl bg-black/50/40 p-2.5 flex flex-col space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-[#806f47]/20">
                <span className="font-bold text-[11px] text-amber-400">ABILITY REGISTRY</span>
                <select
                  value={abilityDomainFilter}
                  onChange={(e) => setAbilityDomainFilter(e.target.value)}
                  className="bg-black/50 border border-[#806f47]/30 rounded px-1.5 py-0.5 text-[10px] text-slate-300"
                >
                  <option value="all">All Domains</option>
                  <option value="player_rt">Player RT</option>
                  <option value="creature_tb">Creature TB</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {filteredAbilities.map((ab) => (
                  <button
                    key={ab.id}
                    onClick={() => setSelectedAbility(ab)}
                    className={`w-full text-left p-2 rounded-lg border transition-all cursor-pointer flex justify-between items-center ${
                      selectedAbility?.id === ab.id
                        ? 'border-amber-500 bg-amber-950/30 text-amber-200'
                        : 'border-[#806f47]/20 bg-black/50/20 hover:border-[#806f47]/30 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">{ab.name}</div>
                      <div className="text-[9px] text-slate-500">{ab.style} • {ab.domain}</div>
                    </div>
                    {ab.isCapture && (
                      <span className="text-[8px] bg-rose-950 text-rose-300 px-1 rounded border border-rose-800">
                        CAPTURE
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Inspector */}
            <div className="md:col-span-2 border border-[#806f47]/20 rounded-xl bg-black/50/40 p-3 flex flex-col justify-between space-y-3">
              {selectedAbility ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between items-start border-b border-[#806f47]/20 pb-2">
                      <div>
                        <h3 className="font-bold text-sm text-amber-300">{selectedAbility.name}</h3>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {selectedAbility.id}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-transparent border border-[#806f47]/30 text-slate-300 font-bold uppercase">
                        {selectedAbility.style}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {selectedAbility.description || 'No description provided.'}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                      <div className="bg-black/50/20 p-2 rounded border border-[#806f47]/20 text-center">
                        <span className="text-[9px] text-slate-500 block">Domain</span>
                        <span className="font-bold text-amber-400">{selectedAbility.domain}</span>
                      </div>
                      <div className="bg-black/50/20 p-2 rounded border border-[#806f47]/20 text-center">
                        <span className="text-[9px] text-slate-500 block">Target</span>
                        <span className="font-bold text-cyan-400">{selectedAbility.target}</span>
                      </div>
                      <div className="bg-black/50/20 p-2 rounded border border-[#806f47]/20 text-center">
                        <span className="text-[9px] text-slate-500 block">Cooldown</span>
                        <span className="font-bold text-slate-300">{selectedAbility.cooldownMs || 0}ms</span>
                      </div>
                      <div className="bg-black/50/20 p-2 rounded border border-[#806f47]/20 text-center">
                        <span className="text-[9px] text-slate-500 block">Accuracy</span>
                        <span className="font-bold text-emerald-400">{selectedAbility.accuracy ?? 100}%</span>
                      </div>
                    </div>

                    {/* Effects list */}
                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Effects Pipeline:
                      </span>
                      <div className="space-y-1">
                        {selectedAbility.effects.map((eff, i) => (
                          <div key={i} className="p-2 rounded bg-black/50/20 border border-[#806f47]/20 text-[11px] flex justify-between">
                            <span className="font-bold text-amber-300 uppercase">{eff.type}</span>
                            <span className="text-slate-400 font-mono">
                              {JSON.stringify(eff)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-black/50/20 rounded border border-amber-500/20 flex justify-between items-center text-[10px]">
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Canonical Gameplay Registry Synced
                    </span>
                  </div>
                </>
              ) : (
                <div className="m-auto text-slate-500 italic">Select an ability to inspect details.</div>
              )}
            </div>
          </div>
        )}

        {/* STATUS DOCK */}
        {activeTab === 'status' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 h-full">
            <div className="border border-[#806f47]/20 rounded-xl bg-black/50/40 p-2.5 space-y-1 overflow-y-auto">
              <span className="font-bold text-[11px] text-rose-400 pb-2 border-b border-[#806f47]/20 block">
                STATUS CONDITIONS
              </span>
              {statuses.map((st) => (
                <button
                  key={st.id}
                  onClick={() => setSelectedStatus(st)}
                  className={`w-full text-left p-2 rounded-lg border transition-all cursor-pointer flex justify-between items-center ${
                    selectedStatus?.id === st.id
                      ? 'border-rose-500 bg-rose-950/30 text-rose-200'
                      : 'border-[#806f47]/20 bg-black/50/20 hover:border-[#806f47]/30 text-slate-300'
                  }`}
                >
                  <span className="font-bold text-xs">{st.name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/50 border border-[#806f47]/20 text-slate-400">
                    {st.category}
                  </span>
                </button>
              ))}
            </div>

            <div className="md:col-span-2 border border-[#806f47]/20 rounded-xl bg-black/50/40 p-3 space-y-3">
              {selectedStatus && (
                <>
                  <div className="flex justify-between items-start border-b border-[#806f47]/20 pb-2">
                    <div>
                      <h3 className="font-bold text-sm" style={{ color: selectedStatus.colorHex }}>
                        {selectedStatus.name}
                      </h3>
                      <span className="text-[10px] text-slate-400">Category: {selectedStatus.category}</span>
                    </div>
                    {selectedStatus.captureModifier && (
                      <span className="text-[10px] bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded border border-amber-600/40 font-bold">
                        Capture Multiplier: {selectedStatus.captureModifier}x
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300">{selectedStatus.description}</p>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="bg-black/50/20 p-2 rounded border border-[#806f47]/20">
                      <span className="text-[9px] text-slate-500 block">RT Duration</span>
                      <span className="font-bold text-slate-200">{selectedStatus.durationMsDefault}ms</span>
                    </div>
                    <div className="bg-black/50/20 p-2 rounded border border-[#806f47]/20">
                      <span className="text-[9px] text-slate-500 block">TB Turns</span>
                      <span className="font-bold text-slate-200">{selectedStatus.durationTurnsDefault} turns</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* SKILLS DOCK */}
        {activeTab === 'skills' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {skills.map((sk) => (
              <div
                key={sk.id}
                className="p-2.5 rounded-xl border border-[#806f47]/20 bg-black/50/40 hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-2"
              >
                <div>
                  <span className="text-[8px] uppercase tracking-wider text-slate-500 block">
                    {sk.category}
                  </span>
                  <span className="font-bold text-xs" style={{ color: sk.themeColor }}>
                    {sk.name}
                  </span>
                </div>
                <div className="text-[9px] text-slate-400 leading-tight line-clamp-2">
                  {sk.description}
                </div>
                <div className="text-[8px] text-cyan-400 font-mono pt-1 border-t border-slate-900 flex justify-between">
                  <span>Max: Lv {sk.maxLevel}</span>
                  <span className="uppercase">{sk.xpCurveId.replace('_curve', '')}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PROFESSIONS DOCK */}
        {activeTab === 'professions' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {professions.map((prof) => (
              <div
                key={prof.id}
                className="p-3 rounded-xl border border-[#806f47]/20 bg-black/50/40 flex flex-col justify-between space-y-2 hover:border-[#806f47]/30 transition-all"
                style={{ borderLeft: `3px solid ${prof.themeColor || '#64748b'}` }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-amber-300">{prof.name}</span>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {prof.subCategory}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 block font-mono">Primary: {prof.primarySkillId}</span>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-3">{prof.description}</p>
                <div className="pt-2 border-t border-slate-900 space-y-1 text-[9px]">
                  <span className="text-slate-500 block">Stations:</span>
                  <div className="flex flex-wrap gap-1">
                    {prof.stationTags.map((st) => (
                      <span key={st} className="px-1.5 py-0.5 rounded bg-black/50 border border-[#806f47]/20 text-slate-300">
                        #{st}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* BALANCE SIMULATOR DOCK */}
        {activeTab === 'balance' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-xl border border-purple-500/40 bg-black/50/50 space-y-3">
              <h3 className="font-bold text-xs text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5" /> Simulation Parameters
              </h3>

              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Player Level</label>
                  <input
                    type="number"
                    value={simLevel}
                    onChange={(e) => setSimLevel(Number(e.target.value))}
                    className="w-full bg-black/50 border border-[#806f47]/30 rounded p-1.5 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Ability</label>
                  <select
                    value={simAbilityId}
                    onChange={(e) => setSimAbilityId(e.target.value)}
                    className="w-full bg-black/50 border border-[#806f47]/30 rounded p-1.5 text-xs text-slate-200"
                  >
                    {abilities.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.style})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Target Max HP</label>
                  <input
                    type="number"
                    value={simHp}
                    onChange={(e) => setSimHp(Number(e.target.value))}
                    className="w-full bg-black/50 border border-[#806f47]/30 rounded p-1.5 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Target Defense</label>
                  <input
                    type="number"
                    value={simDef}
                    onChange={(e) => setSimDef(Number(e.target.value))}
                    className="w-full bg-black/50 border border-[#806f47]/30 rounded p-1.5 text-xs text-slate-200"
                  />
                </div>
              </div>

              <button
                onClick={handleRunSimulation}
                className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" /> Execute 100x Monte Carlo Sim
              </button>
            </div>

            {/* Results */}
            <div className="p-4 rounded-xl border border-[#806f47]/20 bg-black/50/40 flex flex-col justify-between space-y-3">
              <div>
                <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">
                  Simulation Projections
                </h3>

                {simReport ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-black/50/20 p-2 rounded border border-purple-500/20 text-center">
                        <span className="text-[9px] text-slate-500 block">Average Damage</span>
                        <span className="font-bold text-sm text-purple-300">{simReport.avgDamage}</span>
                      </div>
                      <div className="bg-black/50/20 p-2 rounded border border-purple-500/20 text-center">
                        <span className="text-[9px] text-slate-500 block">Sustained DPS</span>
                        <span className="font-bold text-sm text-purple-300">{simReport.dps}</span>
                      </div>
                      <div className="bg-black/50/20 p-2 rounded border border-purple-500/20 text-center">
                        <span className="text-[9px] text-slate-500 block">Time-to-Kill (TTK)</span>
                        <span className="font-bold text-sm text-emerald-400">{simReport.timeToKillSec}s</span>
                      </div>
                      <div className="bg-black/50/20 p-2 rounded border border-purple-500/20 text-center">
                        <span className="text-[9px] text-slate-500 block">Est. XP / Hour</span>
                        <span className="font-bold text-sm text-amber-400">{simReport.xpPerHourEstimate}</span>
                      </div>
                    </div>

                    {simReport.warnings.length > 0 && (
                      <div className="p-2 bg-amber-950/40 border border-amber-600/40 rounded text-[10px] text-amber-300 space-y-1">
                        <div className="font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Warnings:
                        </div>
                        {simReport.warnings.map((w, i) => (
                          <div key={i}>• {w}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-500 italic text-center py-12">
                    Run simulation to compute DPS, TTK, and XP projection metrics.
                  </div>
                )}
              </div>

              <div className="text-[9px] text-slate-500">
                Formula model aligns with Bible 25 §3.8 deterministic balancing suite.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
