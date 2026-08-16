import { describe, it, expect } from 'vitest';
import { queryInteractions, PlayerInteractionContext, WorldInteractionContext } from './interactionResolver';
import { createEntityFromArchetype } from './entities/index';

describe('Context-Sensitive Interaction Resolver (Bible 34 §4)', () => {
  const player: PlayerInteractionContext = {
    id: 'player_1',
    level: 10,
    skills: { woodcutting: 25, mining: 5 },
  };

  const exploringContext: WorldInteractionContext = {
    gameMode: 'EXPLORING',
    distance: 1.0,
  };

  const battleContext: WorldInteractionContext = {
    gameMode: 'BATTLE',
    distance: 1.0,
  };

  it('resolves Talk action for NPC entities', () => {
    const npc = createEntityFromArchetype('npc', 'Shopkeeper Maya', 5, 5);
    const actions = queryInteractions(player, npc, exploringContext);

    const talkAction = actions.find((a) => a.type === 'TALK');
    expect(talkAction).toBeDefined();
    expect(talkAction?.enabled).toBe(true);
    expect(talkAction?.label).toContain('Shopkeeper Maya');
  });

  it('enforces skill level requirements for Resource Nodes', () => {
    const highLevelTree = createEntityFromArchetype('resource_node', 'Elder Yew', 10, 10);
    highLevelTree.components.resource_node = {
      resourceType: 'wood',
      skillRequired: 'woodcutting',
      minLevel: 50,
      yieldsRemaining: 3,
    };

    const actions = queryInteractions(player, highLevelTree, exploringContext);
    const harvestAction = actions.find((a) => a.type === 'HARVEST');

    expect(harvestAction).toBeDefined();
    expect(harvestAction?.enabled).toBe(false);
    expect(harvestAction?.disabledReason).toContain('Requires woodcutting Level 50');
  });

  it('strictly disables Capture in overworld EXPLORING and enables it in BATTLE (Constitution Bible 07 §4)', () => {
    const wildCreature = createEntityFromArchetype('monster', 'Wild Rockitten', 6, 6);
    wildCreature.components.capabilities = { capturable: true, hostile: true };

    // Overworld check: Capture disabled
    const overworldActions = queryInteractions(player, wildCreature, exploringContext);
    const overworldCapture = overworldActions.find((a) => a.type === 'CAPTURE');
    expect(overworldCapture?.enabled).toBe(false);
    expect(overworldCapture?.disabledReason).toContain('Turn-Based Buddy Battles');

    // Battle check: Capture enabled
    const battleActions = queryInteractions(player, wildCreature, battleContext);
    const battleCapture = battleActions.find((a) => a.type === 'CAPTURE');
    expect(battleCapture?.enabled).toBe(true);
  });

  it('returns empty actions if target entity is out of interaction distance', () => {
    const npc = createEntityFromArchetype('npc', 'Far Away NPC', 20, 20);
    const farContext: WorldInteractionContext = {
      gameMode: 'EXPLORING',
      distance: 5.0, // max is 2.0
    };

    const actions = queryInteractions(player, npc, farContext);
    expect(actions.length).toBe(0);
  });
});
