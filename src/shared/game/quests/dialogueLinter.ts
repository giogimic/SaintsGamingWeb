/**
 * Saints Gaming — Dialogue & Quest Graph Linter (Bible 15 & Bible 16)
 * Graph validator detecting broken seraphtNode pointers, unreachable steps, and dead-end options.
 */

import { DialogueNode } from './dialogueEngine';

export type DialogueLintCode =
  | 'MISSING_TARGET_NODE'
  | 'UNREACHABLE_NODE'
  | 'DEAD_END_NODE'
  | 'DUPLICATE_NODE_ID';

export interface DialogueLintIssue {
  severity: 'error' | 'warning';
  code: DialogueLintCode;
  nodeId: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface DialogueLintReport {
  valid: boolean;
  errors: DialogueLintIssue[];
  warnings: DialogueLintIssue[];
}

/**
 * Lints a collection of dialogue nodes forming a conversation tree graph.
 */
export function lintDialogueTree(
  nodes: DialogueNode[],
  startNodeId: string = 'node_start'
): DialogueLintReport {
  const errors: DialogueLintIssue[] = [];
  const warnings: DialogueLintIssue[] = [];

  const nodeMap = new Map<string, DialogueNode>();
  const seenIds = new Set<string>();

  // 1. Duplicate ID Check
  for (const node of nodes) {
    if (seenIds.has(node.id)) {
      errors.push({
        severity: 'error',
        code: 'DUPLICATE_NODE_ID',
        nodeId: node.id,
        message: `Duplicate dialogue node ID '${node.id}' found in tree.`,
      });
    } else {
      seenIds.add(node.id);
      nodeMap.set(node.id, node);
    }
  }

  // 2. Broken SeraphtNode Pointers & Dead-End Checks
  for (const node of nodes) {
    if (!node.options || node.options.length === 0) {
      warnings.push({
        severity: 'warning',
        code: 'DEAD_END_NODE',
        nodeId: node.id,
        message: `Dialogue node '${node.id}' has 0 options (dead end).`,
      });
      continue;
    }

    for (const opt of node.options) {
      const target = opt.seraphtNodeId;
      if (!target || target === 'exit') continue;

      if (!nodeMap.has(target)) {
        errors.push({
          severity: 'error',
          code: 'MISSING_TARGET_NODE',
          nodeId: node.id,
          message: `Option '${opt.label || opt.id}' in node '${node.id}' targets non-existent node '${target}'.`,
          details: { optionId: opt.id, missingTarget: target },
        });
      }
    }
  }

  // 3. Reachability Check (BFS from startNodeId)
  if (nodeMap.has(startNodeId)) {
    const reachable = new Set<string>();
    const queue: string[] = [startNodeId];
    reachable.add(startNodeId);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const curr = nodeMap.get(currentId);
      if (!curr || !curr.options) continue;

      for (const opt of curr.options) {
        const serapht = opt.seraphtNodeId;
        if (serapht && serapht !== 'exit' && nodeMap.has(serapht) && !reachable.has(serapht)) {
          reachable.add(serapht);
          queue.push(serapht);
        }
      }
    }

    for (const node of nodes) {
      if (!reachable.has(node.id)) {
        warnings.push({
          severity: 'warning',
          code: 'UNREACHABLE_NODE',
          nodeId: node.id,
          message: `Dialogue node '${node.id}' cannot be reached from root start node '${startNodeId}'.`,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
