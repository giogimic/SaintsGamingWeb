import React, { useState } from "react";
import { Wand2, Swords, Shield, Activity, Save } from "lucide-react";
import { WindowMenuBar, WindowMenuTabGroup } from "../WindowMenuBar";
import { AbilityWorkspace } from "./AbilityWorkspace";
import { ProfessionEditorPanel } from "../panels/ProfessionEditorPanel";
import { StatusEditorPanel } from "../panels/StatusEditorPanel";
import { CombatSimulatorPanel } from "../panels/CombatSimulatorPanel";

export function GameplayStudioSuite() {
  const [activeTab, setActiveTab] = useState<"abilities" | "professions" | "status" | "combat">("abilities");

  const tabs = [
    { id: 'abilities', label: 'Abilities & Skills', icon: Wand2 },
    { id: 'professions', label: 'Professions', icon: Shield },
    { id: 'status', label: 'Status Effects', icon: Activity },
    { id: 'combat', label: 'Simulator', icon: Swords },
  ];

  return (
    <div className="flex flex-col h-full bg-background text-slate-200">
      <WindowMenuBar className="h-10 py-1.5 px-3 bg-card/95">
        <WindowMenuTabGroup
          tabs={tabs}
          activeTab={activeTab}
          onChange={(id: string) => setActiveTab(id as any)}
        />
      </WindowMenuBar>
      
      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === "abilities" && <AbilityWorkspace />}
        {activeTab === "professions" && <ProfessionEditorPanel />}
        {activeTab === "status" && <StatusEditorPanel />}
        {activeTab === "combat" && <CombatSimulatorPanel />}
      </div>
    </div>
  );
}
