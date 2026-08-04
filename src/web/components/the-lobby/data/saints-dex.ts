/**
 * Presentation adapter over the canonical creature catalog.
 * Prefer creatureCatalog / CreatureDef DB for authority; this shape is for lobby UI only.
 */
import {
  FALLBACK_CREATURE_DEFS,
  creatureAssetUrl,
  type CreatureDefData,
  type CreatureElementType,
} from "@/shared/game/creatureCatalog";

export type ElementType = CreatureElementType;

export interface CreatureStatProfile {
  HP: number;
  ATK: number;
  DEF: number;
  SPD: number;
}

export interface CreatureSchema {
  id: string;
  name: string;
  type_primary: ElementType;
  type_secondary: ElementType;
  stat_profile: CreatureStatProfile;
  passive_ability: string;
  world_skill: string;
  assetPath?: string;
}

function toSchema(def: CreatureDefData): CreatureSchema {
  const passive = def.passives.find((p) => p.isDefault) ?? def.passives[0];
  return {
    id: def.slug,
    name: def.name,
    type_primary: (def.typePrimary || "None") as ElementType,
    type_secondary: (def.typeSecondary || "None") as ElementType,
    stat_profile: {
      HP: def.baseHp,
      ATK: def.physicalPower,
      DEF: def.physicalDefense,
      SPD: def.combatTempo,
    },
    passive_ability: passive
      ? `${passive.name}: ${passive.description}`
      : "",
    world_skill: `${def.worldSkillName}: ${def.worldSkillDescription}`,
    assetPath: creatureAssetUrl(def.spriteOverworld || def.spriteBattle),
  };
}

export const SAINTS_DEX: CreatureSchema[] = FALLBACK_CREATURE_DEFS.map(toSchema);

export const getCreatureById = (id: string): CreatureSchema | undefined => {
  if (!id) return undefined;
  const bySlug = FALLBACK_CREATURE_DEFS.find((c) => c.slug === id);
  if (bySlug) return toSchema(bySlug);
  const num = parseInt(String(id).replace(/\D/g, ""), 10);
  if (!Number.isNaN(num) && num > 0) {
    const byDex = FALLBACK_CREATURE_DEFS.find((c) => c.dexNumber === num);
    if (byDex) return toSchema(byDex);
  }
  return SAINTS_DEX.find((c) => c.id === id);
};
