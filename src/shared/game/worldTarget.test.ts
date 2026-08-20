import { describe, it, expect } from 'vitest';
import {
  calculateFootprintRadius,
  isTargetInRange,
  resolveTargetPrimaryAction,
  evaluateEntityTarget,
  evaluateTileTarget,
} from './worldTarget';
import { EntityInstanceV1 } from './entities/types';

describe('Unified WorldTarget Spatial Interaction System', () => {
  describe('1. Footprint & Radius Calculations', () => {
    it('calculates ground target ring radius based on footprint width/height', () => {
      expect(calculateFootprintRadius(1, 1)).toBe(0.55);
      expect(calculateFootprintRadius(2, 2)).toBe(1.1);
      expect(calculateFootprintRadius(3, 3)).toBe(1.6);
      expect(calculateFootprintRadius(4, 4)).toBe(2.2);
    });

    it('determines reachability based on maxDistance threshold', () => {
      expect(isTargetInRange(1.2, 2.0)).toBe(true);
      expect(isTargetInRange(2.0, 2.0)).toBe(true);
      expect(isTargetInRange(2.5, 2.0)).toBe(false);
    });
  });

  describe('2. Primary Action Resolution', () => {
    it('resolves primary action and maps default interaction keys', () => {
      const talkAction = resolveTargetPrimaryAction([
        { id: 'npc_talk', type: 'TALK', label: 'Talk to Professor Oakwood', primary: true, enabled: true },
      ]);
      expect(talkAction).toBeDefined();
      expect(talkAction?.key).toBe('E');
      expect(talkAction?.type).toBe('TALK');
      expect(talkAction?.label).toBe('Talk to Professor Oakwood');

      const attackAction = resolveTargetPrimaryAction([
        { id: 'mob_attack', type: 'ATTACK', label: 'Attack Wild Wolf', primary: true, enabled: true },
      ]);
      expect(attackAction?.key).toBe('SPACE');
      expect(attackAction?.type).toBe('ATTACK');
    });

    it('handles empty interaction options gracefully', () => {
      expect(resolveTargetPrimaryAction([])).toBeUndefined();
    });
  });

  describe('3. Entity Target Evaluation', () => {
    it('evaluates NPC with dialogue into an interactable WorldTarget', () => {
      const npcEntity: EntityInstanceV1 = {
        schemaVersion: 1,
        id: 'npc_oakwood',
        archetype: 'npc',
        components: {
          identity: { name: 'Professor Oakwood', slug: 'professor-oakwood' },
          transform: { x: 5, y: 5 },
          dialogue: { dialogueKey: 'oakwood_intro', speakerName: 'Professor Oakwood' },
          interact: { enabled: true },
        },
      };

      const target = evaluateEntityTarget({
        entity: npcEntity,
        playerPos: { x: 5, y: 4 }, // distance = 1.0 (within reach)
      });

      expect(target.kind).toBe('entity');
      expect(target.name).toBe('Professor Oakwood');
      expect(target.tile).toEqual({ r: 5, c: 5 });
      expect(target.distance).toBe(1);
      expect(target.interactable).toBe(true);
      expect(target.primaryAction?.type).toBe('TALK');
      expect(target.primaryAction?.label).toContain('Talk to Professor Oakwood');
      expect(target.footprint.radius).toBe(0.55);
    });

    it('evaluates creature/monster with health stats and level', () => {
      const monsterEntity: EntityInstanceV1 = {
        schemaVersion: 1,
        id: 'mob_wolf_01',
        archetype: 'monster',
        components: {
          identity: { name: 'Shadow Wolf', slug: 'shadow-wolf' },
          transform: { x: 10, y: 10 },
          combatant: { currentHp: 85, maxHp: 100, level: 12, armorClass: 10 },
          footprint: { width: 2, height: 2 },
        },
      };

      const target = evaluateEntityTarget({
        entity: monsterEntity,
        playerPos: { x: 7, y: 10 }, // distance = 3.0
      });

      expect(target.kind).toBe('creature');
      expect(target.name).toBe('Shadow Wolf');
      expect(target.level).toBe(12);
      expect(target.health).toEqual({ current: 85, max: 100 });
      expect(target.footprint.radius).toBe(1.1);
      expect(target.distance).toBe(3);
    });
  });

  describe('4. Tile & Object Target Evaluation', () => {
    it('evaluates walkable ground tile with soft status', () => {
      const tileTarget = evaluateTileTarget({
        r: 8,
        c: 12,
        playerPos: { x: 8, y: 8 },
        isSolid: false,
      });

      expect(tileTarget.kind).toBe('tile');
      expect(tileTarget.status).toBe('valid');
      expect(tileTarget.interactable).toBe(false);
      expect(tileTarget.distance).toBe(4);
    });

    it('evaluates solid blocked tile', () => {
      const tileTarget = evaluateTileTarget({
        r: 2,
        c: 2,
        playerPos: { x: 2, y: 1 },
        isSolid: true,
      });

      expect(tileTarget.kind).toBe('tile');
      expect(tileTarget.status).toBe('blocked');
    });

    it('evaluates warp gate with travel action', () => {
      const gateTarget = evaluateTileTarget({
        r: 15,
        c: 15,
        playerPos: { x: 15, y: 14 },
        isSolid: false,
        warpGate: { name: 'Paper Town', targetMapId: 'PAPER_TOWN' },
      });

      expect(gateTarget.kind).toBe('gate');
      expect(gateTarget.name).toBe('Paper Town');
      expect(gateTarget.interactable).toBe(true);
      expect(gateTarget.primaryAction?.type).toBe('WARP');
      expect(gateTarget.primaryAction?.label).toContain('Enter Paper Town');
    });
  });
});
