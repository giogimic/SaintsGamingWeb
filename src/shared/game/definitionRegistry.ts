/**
 * definitionRegistry.ts — Shared cross-reference types for the Studio dependency graph.
 *
 * Every content system in the Studio (quests, dungeons, items, shops, mounts, etc.)
 * stores references to other systems via slug strings inside JSON data columns.
 * This module provides the canonical vocabulary for those relationships.
 *
 * Part 3 §10–12 of the Studio Plan.
 */

/** All content definition types that participate in the cross-reference graph. */
export type DefinitionType =
  | 'quest'
  | 'npc'
  | 'item'
  | 'creature'
  | 'dungeon'
  | 'shop'
  | 'mount'
  | 'recipe'
  | 'profession'
  | 'worldevent'
  | 'simulation'
  | 'loot'
  | 'ability'
  | 'map';

/** Human-readable labels for each definition type. */
export const DEFINITION_TYPE_LABELS: Record<DefinitionType, string> = {
  quest: 'Quest',
  npc: 'NPC',
  item: 'Item',
  creature: 'Creature',
  dungeon: 'Dungeon',
  shop: 'Shop',
  mount: 'Mount',
  recipe: 'Recipe',
  profession: 'Profession',
  worldevent: 'World Event',
  simulation: 'Simulation Preset',
  loot: 'Loot Table',
  ability: 'Ability',
  map: 'Map',
};

/** A pointer to a single definition in the content graph. */
export interface DefinitionRef {
  type: DefinitionType;
  slug: string;
}

/** Describes the nature of a relationship between two definitions. */
export type ReferenceRelationship =
  | 'contains'        // e.g. dungeon contains maps
  | 'rewards'         // e.g. dungeon rewards loot
  | 'sells'           // e.g. shop sells items
  | 'requires'        // e.g. mount requires quest
  | 'drops'           // e.g. creature drops loot
  | 'teaches'         // e.g. profession teaches recipe
  | 'uses_asset'      // e.g. mount uses sprite asset
  | 'acquired_from'   // e.g. mount acquired from shop/quest/drop
  | 'mutates'         // e.g. world event mutates world state
  | 'references';     // generic catch-all for parsed JSON refs

/** A directed edge in the content dependency graph. */
export interface CrossReference {
  /** The definition that holds the reference. */
  source: DefinitionRef;
  /** The definition being referenced. */
  target: DefinitionRef;
  /** What the relationship means. */
  relationship: ReferenceRelationship;
  /** Optional human-readable context, e.g. "in mapReferences[2]". */
  context?: string;
}

/** Grouped inbound/outbound references for a single definition. */
export interface ReferenceReport {
  /** The definition being inspected. */
  subject: DefinitionRef;
  /** References FROM this definition TO others. */
  outbound: CrossReference[];
  /** References FROM others TO this definition. */
  inbound: CrossReference[];
}

/**
 * Helper: create a DefinitionRef.
 */
export function defRef(type: DefinitionType, slug: string): DefinitionRef {
  return { type, slug };
}

/**
 * Helper: create a CrossReference edge.
 */
export function crossRef(
  sourceType: DefinitionType,
  sourceSlug: string,
  targetType: DefinitionType,
  targetSlug: string,
  relationship: ReferenceRelationship = 'references',
  context?: string,
): CrossReference {
  return {
    source: { type: sourceType, slug: sourceSlug },
    target: { type: targetType, slug: targetSlug },
    relationship,
    context,
  };
}
