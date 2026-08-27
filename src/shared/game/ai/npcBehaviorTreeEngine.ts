/**
 * Saints Gaming — Master AI NPC Behavior Trees, Dynamic Social Gossip & Ambient Realm Simulation Engine (Bible 09–11, 24–26)
 * Manages hierarchical behavior trees, social gossip propagation across NPC networks, and day/night schedule routine shifts.
 */

export type BehaviorNodeType =
  | 'SELECTOR'
  | 'SEQUENCE'
  | 'PARALLEL'
  | 'ACTION'
  | 'CONDITION'
  | 'INVERTER';

export type BehaviorNodeStatus = 'SUCCESS' | 'FAILURE' | 'RUNNING';

export type DayNightPhase = 'DAWN' | 'DAY' | 'DUSK' | 'NIGHT';

export interface SocialRumor {
  rumorId: string;
  topic: string;
  headline: string;
  reputationImpact: number;
  originNpcId: string;
  spreadCount: number;
  timestamp: number;
}

export interface NpcBlackboard {
  npcId: string;
  name: string;
  healthPercent: number;
  isPlayerNearby: boolean;
  nearbyPlayerName?: string;
  currentPhase: DayNightPhase;
  assignedWorkstation: string;
  knownRumors: SocialRumor[];
  activeAction?: string;
}

export interface BehaviorTreeNode {
  id: string;
  type: BehaviorNodeType;
  children?: BehaviorTreeNode[];
  actionName?: string;
  conditionFn?: (blackboard: NpcBlackboard) => boolean;
  actionFn?: (blackboard: NpcBlackboard) => BehaviorNodeStatus;
}

export class NpcBehaviorTreeEngine {
  /**
   * Recursively evaluates a behavior tree node hierarchy against the NPC blackboard state.
   */
  public evaluateTree(node: BehaviorTreeNode, blackboard: NpcBlackboard): BehaviorNodeStatus {
    switch (node.type) {
      case 'ACTION': {
        if (node.actionFn) {
          const status = node.actionFn(blackboard);
          if (status === 'SUCCESS' || status === 'RUNNING') {
            blackboard.activeAction = node.actionName || node.id;
          }
          return status;
        }
        blackboard.activeAction = node.actionName || node.id;
        return 'SUCCESS';
      }

      case 'CONDITION': {
        if (!node.conditionFn) return 'SUCCESS';
        return node.conditionFn(blackboard) ? 'SUCCESS' : 'FAILURE';
      }

      case 'INVERTER': {
        if (!node.children || node.children.length === 0) return 'FAILURE';
        const childStatus = this.evaluateTree(node.children[0], blackboard);
        if (childStatus === 'SUCCESS') return 'FAILURE';
        if (childStatus === 'FAILURE') return 'SUCCESS';
        return 'RUNNING';
      }

      case 'SELECTOR': {
        // Returns SUCCESS on first child that succeeds
        if (!node.children) return 'FAILURE';
        for (const child of node.children) {
          const status = this.evaluateTree(child, blackboard);
          if (status === 'SUCCESS' || status === 'RUNNING') {
            return status;
          }
        }
        return 'FAILURE';
      }

      case 'SEQUENCE': {
        // Requires all children to succeed
        if (!node.children) return 'SUCCESS';
        for (const child of node.children) {
          const status = this.evaluateTree(child, blackboard);
          if (status === 'FAILURE' || status === 'RUNNING') {
            return status;
          }
        }
        return 'SUCCESS';
      }

      case 'PARALLEL': {
        if (!node.children) return 'SUCCESS';
        let anyRunning = false;
        for (const child of node.children) {
          const status = this.evaluateTree(child, blackboard);
          if (status === 'FAILURE') return 'FAILURE';
          if (status === 'RUNNING') anyRunning = true;
        }
        return anyRunning ? 'RUNNING' : 'SUCCESS';
      }

      default:
        return 'FAILURE';
    }
  }

  /**
   * Spreads a social rumor from one NPC to another if not already known.
   */
  public propagateRumor(
    rumor: SocialRumor,
    _sourceNpc: NpcBlackboard,
    targetNpc: NpcBlackboard
  ): boolean {
    const alreadyKnown = targetNpc.knownRumors.some((r) => r.rumorId === rumor.rumorId);
    if (alreadyKnown) return false;

    rumor.spreadCount++;
    targetNpc.knownRumors.push({ ...rumor });
    return true;
  }

  /**
   * Updates an NPC's schedule goal based on the current day/night cycle phase.
   */
  public updateDayNightPhase(
    blackboard: NpcBlackboard,
    phase: DayNightPhase
  ): 'WORK' | 'MARKET' | 'TAVERN' | 'SLEEP' {
    blackboard.currentPhase = phase;

    switch (phase) {
      case 'DAWN':
        blackboard.activeAction = 'WORK';
        return 'WORK';
      case 'DAY':
        blackboard.activeAction = 'MARKET';
        return 'MARKET';
      case 'DUSK':
        blackboard.activeAction = 'TAVERN';
        return 'TAVERN';
      case 'NIGHT':
        blackboard.activeAction = 'SLEEP';
        return 'SLEEP';
    }
  }
}
