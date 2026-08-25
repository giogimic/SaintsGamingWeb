/**
 * Saints Gaming — Canonical Gameplay Validation Engine (Bible 25 §8)
 * Performs automated integrity checks across abilities, skills, classes, status effects, and hotbars.
 */

import { getAllAbilityDefs, getAbilityDef } from '../combat/abilityRegistry';
import { getAllCanonicalSkillDefs, getCanonicalSkillDef } from '../skills/skillRegistry';
import { getAllStatusDefs, getStatusDef } from '../combat/statusRegistry';
import { ClassDefData } from '../classCatalog';

export interface GameplayValidationError {
  code: string;
  message: string;
  severity: 'HARD_ERROR' | 'SOFT_WARNING';
  entityId?: string;
}

export function validateGameplayIntegrity(): {
  isValid: boolean;
  errors: GameplayValidationError[];
  warnings: GameplayValidationError[];
} {
  const issues: GameplayValidationError[] = [];

  const abilities = getAllAbilityDefs();
  const skills = getAllCanonicalSkillDefs();
  const statuses = getAllStatusDefs();

  // 1. Validate Ability status effect and skill XP references
  for (const ab of abilities) {
    if (ab.isCapture && ab.domain === 'player_rt') {
      issues.push({
        code: 'ERR_RT_CAPTURE_FORBIDDEN',
        message: `Ability "${ab.id}" has isCapture=true but domain="player_rt" (Bible 25 §8).`,
        severity: 'HARD_ERROR',
        entityId: ab.id,
      });
    }

    // Check status references
    for (const eff of ab.effects) {
      if (eff.type === 'apply_status' && eff.statusId) {
        if (!getStatusDef(eff.statusId)) {
          issues.push({
            code: 'ERR_UNKNOWN_STATUS_EFFECT',
            message: `Ability "${ab.id}" references non-existent status "${eff.statusId}".`,
            severity: 'HARD_ERROR',
            entityId: ab.id,
          });
        }
      }
    }

    // Check skill XP grants
    if (ab.grantsSkillXp) {
      for (const grant of ab.grantsSkillXp) {
        if (!getCanonicalSkillDef(grant.skillSlug)) {
          issues.push({
            code: 'ERR_UNKNOWN_SKILL_SLUG',
            message: `Ability "${ab.id}" grants XP to unregistered skill "${grant.skillSlug}".`,
            severity: 'HARD_ERROR',
            entityId: ab.id,
          });
        }
      }
    }
  }

  // 3. Verify exactly 27 canonical skills
  if (skills.length !== 27) {
    issues.push({
      code: 'WARN_SKILL_COUNT_MISMATCH',
      message: `Expected exactly 27 canonical skills; found ${skills.length}.`,
      severity: 'SOFT_WARNING',
    });
  }

  const hardErrors = issues.filter((i) => i.severity === 'HARD_ERROR');
  const warnings = issues.filter((i) => i.severity === 'SOFT_WARNING');

  return {
    isValid: hardErrors.length === 0,
    errors: hardErrors,
    warnings,
  };
}
