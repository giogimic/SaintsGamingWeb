'use client';

import { useState } from 'react';
import { useGameStore } from '../store';
import { FloatingWindow } from '../hud/FloatingWindow';
import { SkillInspectPanel } from '../SkillGuideModal';
import SkillGuideFull from '../SkillGuideFull';
import SkillsContent from '../skills-overlay';
import { Sword } from 'lucide-react';

/**
 * SkillsWindow — floating window wrapper for the skills interface.
 *
 * Internally manages the 3-level drill-down:
 *   Level 1: Skill grid (SkillsContent)
 *   Level 2: Skill inspect panel (SkillInspectPanel) — separate FloatingWindow
 *   Level 3: Full skill guide (SkillGuideFull) — separate FloatingWindow
 */
export function SkillsWindow() {
  const isOpen = useGameStore((s) => s.openWindows.includes('skills'));
  const closeWindow = useGameStore((s) => s.closeWindow);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [guideSkill, setGuideSkill] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <>
      <FloatingWindow
        id="window-skills"
        title="SAINT SKILLS & PROFICIENCY"
        icon={<Sword className="w-4 h-4 text-amber-400" />}
        isOpen={isOpen}
        onClose={() => {
          setSelectedSkill(null);
          setGuideSkill(null);
          closeWindow('skills');
        }}
        defaultWidth={860}
        defaultHeight={620}
        minWidth={600}
        minHeight={400}
      >
        <SkillsContent
          onSelectSkill={(slug) => setSelectedSkill(slug)}
          onDeselectSkill={() => setSelectedSkill(null)}
        />
      </FloatingWindow>

      {/* Level 2: Inspect Panel */}
      {selectedSkill && (
        <SkillInspectPanel
          skillSlug={selectedSkill}
          onClose={() => setSelectedSkill(null)}
          onOpenGuide={(slug) => {
            setSelectedSkill(null);
            setGuideSkill(slug);
          }}
        />
      )}

      {/* Level 3: Full Guide */}
      {guideSkill && (
        <SkillGuideFull
          skillSlug={guideSkill}
          onClose={() => setGuideSkill(null)}
        />
      )}
    </>
  );
}
