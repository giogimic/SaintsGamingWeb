import { describe, expect, it } from 'vitest';
import {
  BehaviorTreeNode,
  NpcBehaviorTreeEngine,
  NpcBlackboard,
  SocialRumor,
} from './npcBehaviorTreeEngine';

describe('Master AI NPC Behavior Trees, Dynamic Social Gossip & Ambient Realm Simulation Engine (Phase 34)', () => {
  it('evaluates hierarchical behavior trees selecting high-priority self-preservation actions', () => {
    const engine = new NpcBehaviorTreeEngine();

    // Behavior Tree Root: Selector
    // 1. If low health (< 25%) -> FLEE
    // 2. If player nearby -> CONVERSE
    // 3. Else -> PATROL
    const treeRoot: BehaviorTreeNode = {
      id: 'root_selector',
      type: 'SELECTOR',
      children: [
        {
          id: 'flee_sequence',
          type: 'SEQUENCE',
          children: [
            {
              id: 'cond_low_health',
              type: 'CONDITION',
              conditionFn: (bb) => bb.healthPercent < 25,
            },
            {
              id: 'action_flee',
              type: 'ACTION',
              actionName: 'FLEE_TO_SAFETY',
              actionFn: () => 'SUCCESS',
            },
          ],
        },
        {
          id: 'converse_sequence',
          type: 'SEQUENCE',
          children: [
            {
              id: 'cond_player_near',
              type: 'CONDITION',
              conditionFn: (bb) => bb.isPlayerNearby,
            },
            {
              id: 'action_greet',
              type: 'ACTION',
              actionName: 'GREET_PLAYER',
              actionFn: () => 'SUCCESS',
            },
          ],
        },
        {
          id: 'action_patrol',
          type: 'ACTION',
          actionName: 'PATROL_AREA',
          actionFn: () => 'SUCCESS',
        },
      ],
    };

    // 1. Healthy NPC with player nearby -> GREET_PLAYER
    const bb1: NpcBlackboard = {
      npcId: 'npc_guard_1',
      name: 'Town Guard',
      healthPercent: 100,
      isPlayerNearby: true,
      currentPhase: 'DAY',
      assignedWorkstation: 'town_gate',
      knownRumors: [],
    };
    const status1 = engine.evaluateTree(treeRoot, bb1);
    expect(status1).toBe('SUCCESS');
    expect(bb1.activeAction).toBe('GREET_PLAYER');

    // 2. Injured NPC (<25% health) -> FLEE_TO_SAFETY
    const bb2: NpcBlackboard = {
      ...bb1,
      healthPercent: 15,
    };
    const status2 = engine.evaluateTree(treeRoot, bb2);
    expect(status2).toBe('SUCCESS');
    expect(bb2.activeAction).toBe('FLEE_TO_SAFETY');
  });

  it('updates NPC goals across day and night cycle schedule phases', () => {
    const engine = new NpcBehaviorTreeEngine();

    const bb: NpcBlackboard = {
      npcId: 'npc_blacksmith',
      name: 'Blacksmith Doran',
      healthPercent: 100,
      isPlayerNearby: false,
      currentPhase: 'DAWN',
      assignedWorkstation: 'forge',
      knownRumors: [],
    };

    expect(engine.updateDayNightPhase(bb, 'DAWN')).toBe('WORK');
    expect(engine.updateDayNightPhase(bb, 'DAY')).toBe('MARKET');
    expect(engine.updateDayNightPhase(bb, 'DUSK')).toBe('TAVERN');
    expect(engine.updateDayNightPhase(bb, 'NIGHT')).toBe('SLEEP');
  });

  it('propagates social rumors across NPC networks and prevents duplicate ingestion', () => {
    const engine = new NpcBehaviorTreeEngine();

    const rumor: SocialRumor = {
      rumorId: 'rumor_dragon_slain',
      topic: 'WORLD_EVENT',
      headline: 'Saint Alice slayed the ancient Red Dragon in the crags!',
      reputationImpact: 50,
      originNpcId: 'npc_bard',
      spreadCount: 0,
      timestamp: Date.now(),
    };

    const sourceNpc: NpcBlackboard = {
      npcId: 'npc_bard',
      name: 'Bard Lyra',
      healthPercent: 100,
      isPlayerNearby: false,
      currentPhase: 'DUSK',
      assignedWorkstation: 'tavern',
      knownRumors: [rumor],
    };

    const targetNpc: NpcBlackboard = {
      npcId: 'npc_merchant',
      name: 'Merchant Karl',
      healthPercent: 100,
      isPlayerNearby: false,
      currentPhase: 'DUSK',
      assignedWorkstation: 'market_stall',
      knownRumors: [],
    };

    // 1. Initial propagation -> Success
    const propagated = engine.propagateRumor(rumor, sourceNpc, targetNpc);
    expect(propagated).toBe(true);
    expect(targetNpc.knownRumors).toHaveLength(1);
    expect(rumor.spreadCount).toBe(1);

    // 2. Duplicate propagation -> Ignored
    const duplicate = engine.propagateRumor(rumor, sourceNpc, targetNpc);
    expect(duplicate).toBe(false);
    expect(targetNpc.knownRumors).toHaveLength(1);
  });
});
