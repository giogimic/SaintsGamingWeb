/**
 * Creature Handlers — creature_spawned, creature_despawned, creature_moved,
 * creature_hp_update, starter_claimed.
 *
 * Manages NPC/monster/animal entities on the current map.
 */
import type {
  CreatureSpawnPayload,
  CreatureDespawnedPayload,
  CreatureMovedPayload,
  CreatureHpUpdatePayload,
  StarterClaimedPayload,
} from '../protocol.d';
import { useWorldStore, type MapEntity } from '../../state/useWorldStore';
import { usePlayerStore } from '../../state/usePlayerStore';
import { useToastStore } from '../../state/useToastStore';

/**
 * New creature appeared on the map.
 */
export function onCreatureSpawned(data: CreatureSpawnPayload): void {
  const entityId = data.entityId || data.id || '';
  if (!entityId) return;

  const entity: MapEntity = {
    id: entityId,
    type: (data.entityType as MapEntity['type']) || (data.hostile ? 'MONSTER' : 'ANIMAL'),
    spriteKey: data.sprite || data.spriteKey || '',
    position: { x: data.x, y: data.y },
    isMoving: data.isMoving || false,
    facing: ((data.direction?.toUpperCase() || 'DOWN') as MapEntity['facing']),
    mapId: data.mapId,
    name: data.name,
    hp: data.hp,
    maxHp: data.maxHp,
    dialogueKey: data.dialogueNpcId,
  };

  useWorldStore.setState((s) => {
    // Avoid duplicates
    const existing = s.mapEntities.findIndex((e) => e.id === entityId);
    if (existing >= 0) {
      s.mapEntities[existing] = entity;
    } else {
      s.mapEntities.push(entity);
    }
  });
}

/**
 * Creature disappeared from the map.
 */
export function onCreatureDespawned(data: CreatureDespawnedPayload | string): void {
  const entityId = typeof data === 'string' ? data : (data.entityId || data.id || '');
  if (!entityId) return;

  useWorldStore.setState((s) => {
    s.mapEntities = s.mapEntities.filter((e) => e.id !== entityId);
  });
}

/**
 * Creature moved (position update / interpolation target).
 */
export function onCreatureMoved(data: CreatureMovedPayload | ArrayBuffer): void {
  if (data instanceof ArrayBuffer) return; // Binary — not yet handled here

  const entityId = data.entityId;
  if (!entityId) return;

  useWorldStore.setState((s) => {
    const ent = s.mapEntities.find((e) => e.id === entityId);
    if (ent) {
      ent.position = { x: data.x, y: data.y };
      if (data.direction) ent.facing = data.direction.toUpperCase() as MapEntity['facing'];
      if (data.isMoving !== undefined) ent.isMoving = data.isMoving;
      if (data.vx !== undefined) ent.vx = data.vx;
      if (data.vy !== undefined) ent.vy = data.vy;
      if (data.vz !== undefined) ent.vz = data.vz;
    }
  });
}

/**
 * Creature HP changed (damage/healing).
 */
export function onCreatureHpUpdate(data: CreatureHpUpdatePayload): void {
  const entityId = data.entityId || data.id || '';
  if (!entityId) return;

  const hp = data.hp ?? (data.hpPercent !== undefined ? data.hpPercent : undefined);
  if (hp === undefined) return;

  useWorldStore.getState().updateEntityHp(entityId, hp, data.maxHp);
}

/**
 * Player claimed a starter creature.
 */
export function onStarterClaimed(data: StarterClaimedPayload): void {
  if (data.creature) {
    usePlayerStore.getState().addCreatureToParty({
      id: data.creature.id || '',
      speciesSlug: data.creature.speciesSlug || '',
      nickname: data.creature.nickname || data.def?.name || 'Starter',
      level: data.creature.level || 1,
      xp: data.creature.xp || 0,
      currentHp: data.creature.currentHp || data.creature.maxHp || 100,
      maxHp: data.creature.maxHp || 100,
      stats: data.creature.stats || {
        physicalPower: 10,
        physicalDefense: 10,
        abilityPower: 10,
        abilityDefense: 10,
        combatTempo: 10,
      },
      abilities: data.creature.abilities || [],
      status: null,
    });

    useToastStore.getState().showToast(
      `You chose ${data.def?.name || 'a starter'}! Welcome to the world!`,
    );
  }
}
