import React, { useState, useEffect } from "react";
import { Calculator, Play, AlertTriangle } from "lucide-react";
import { simulateCombatScenario, BalanceScenario, BalanceReport, DEFAULT_PLAYER_TUNING } from "@/shared/game/combat/combatBalanceEngine";

export function CombatSimulatorPanel() {
  const [abilities, setAbilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [scenario, setScenario] = useState<Partial<BalanceScenario>>({
    id: "sim_1",
    name: "Standard TTK Test",
    playerLevel: 10,
    targetMaxHp: 500,
    targetDef: 20,
    iterations: 10,
  });
  const [selectedAbilitySlug, setSelectedAbilitySlug] = useState("");

  const [report, setReport] = useState<BalanceReport | null>(null);

  useEffect(() => {
    fetchAbilities();
  }, []);

  const fetchAbilities = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/studio/abilities");
      const data = await res.json();
      if (data.success) {
        setAbilities(data.data);
        if (data.data.length > 0 && !selectedAbilitySlug) {
          setSelectedAbilitySlug(data.data[0].slug);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const runSimulation = () => {
    const ability = abilities.find(a => a.slug === selectedAbilitySlug);
    if (!ability) return;

    const fullScenario: BalanceScenario = {
      id: scenario.id || "sim_1",
      name: scenario.name || "Test",
      playerLevel: scenario.playerLevel || 1,
      targetMaxHp: scenario.targetMaxHp || 100,
      targetDef: scenario.targetDef || 0,
      iterations: scenario.iterations || 10,
      ability: ability,
    };

    const result = simulateCombatScenario(fullScenario, DEFAULT_PLAYER_TUNING);
    setReport(result);
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-br from-[#050b14] to-slate-900/50 p-6 text-slate-200 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold sg-text-gradient flex items-center gap-2">
          <Calculator className="text-primary" /> Combat Simulator
        </h2>
        <p className="text-muted-foreground mt-1">Test abilities against target metrics to measure TTK and DPS.</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="p-4 bg-black/40 border border-border/50 rounded-lg space-y-4">
            <h3 className="font-semibold text-primary border-b border-border/50 pb-2">Simulation Parameters</h3>
            
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Ability to Test</label>
              <select 
                value={selectedAbilitySlug} 
                onChange={(e) => setSelectedAbilitySlug(e.target.value)}
                className="w-full bg-black/60 border border-border/50 rounded px-3 py-1.5 outline-none"
              >
                {abilities.map(a => (
                  <option key={a.slug} value={a.slug}>{a.name} (Power: {a.power})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Attacker Level</label>
                <input 
                  type="number" 
                  value={scenario.playerLevel} 
                  onChange={(e) => setScenario({...scenario, playerLevel: Number(e.target.value)})}
                  className="w-full bg-black/60 border border-border/50 rounded px-3 py-1.5 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Simulated Iterations (Hits)</label>
                <input 
                  type="number" 
                  value={scenario.iterations} 
                  onChange={(e) => setScenario({...scenario, iterations: Number(e.target.value)})}
                  className="w-full bg-black/60 border border-border/50 rounded px-3 py-1.5 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Target Max HP</label>
                <input 
                  type="number" 
                  value={scenario.targetMaxHp} 
                  onChange={(e) => setScenario({...scenario, targetMaxHp: Number(e.target.value)})}
                  className="w-full bg-black/60 border border-border/50 rounded px-3 py-1.5 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Target Defense</label>
                <input 
                  type="number" 
                  value={scenario.targetDef} 
                  onChange={(e) => setScenario({...scenario, targetDef: Number(e.target.value)})}
                  className="w-full bg-black/60 border border-border/50 rounded px-3 py-1.5 outline-none"
                />
              </div>
            </div>

            <button 
              onClick={runSimulation}
              disabled={loading || !selectedAbilitySlug}
              className="w-full mt-4 py-2 bg-primary/20 hover:bg-primary/40 text-primary border border-primary/50 rounded flex justify-center items-center gap-2 transition-all"
            >
              <Play size={16} /> {loading ? "Loading..." : "Run Simulation"}
            </button>
          </div>
        </div>

        <div>
          {report ? (
            <div className="p-4 bg-black/40 border border-primary/20 rounded-lg space-y-4">
              <h3 className="font-semibold text-primary border-b border-primary/20 pb-2">Simulation Results</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-black/60 rounded border border-border/30">
                  <span className="block text-xs text-muted-foreground">Average Damage / Hit</span>
                  <span className="text-xl font-bold text-slate-200">{report.avgDamage.toFixed(1)}</span>
                </div>
                <div className="p-3 bg-black/60 rounded border border-border/30">
                  <span className="block text-xs text-muted-foreground">Est. DPS</span>
                  <span className="text-xl font-bold text-orange-400">{report.dps}</span>
                </div>
                <div className="p-3 bg-black/60 rounded border border-border/30">
                  <span className="block text-xs text-muted-foreground">Time to Kill (Seconds)</span>
                  <span className="text-xl font-bold text-red-400">{report.timeToKillSec}s</span>
                </div>
                <div className="p-3 bg-black/60 rounded border border-border/30">
                  <span className="block text-xs text-muted-foreground">Est. XP / Hour</span>
                  <span className="text-xl font-bold text-green-400">{report.xpPerHourEstimate}</span>
                </div>
              </div>

              {report.warnings.length > 0 && (
                <div className="mt-4 p-3 bg-red-950/30 border border-red-500/30 rounded text-red-400 text-sm">
                  <div className="flex items-center gap-2 mb-2 font-semibold">
                    <AlertTriangle size={16} /> Warnings
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    {report.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground p-8 bg-black/20 border border-border/20 rounded-lg border-dashed">
              Run a simulation to see the results here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
