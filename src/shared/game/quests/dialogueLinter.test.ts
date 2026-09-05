import { describe, it, expect } from 'vitest';
import { lintDialogueTree } from './dialogueLinter';
import { DialogueNode } from './dialogueEngine';

describe('Dialogue & Quest Graph Linter (Bible 15 & Bible 16)', () => {
  it('validates a clean, fully reachable dialogue tree with 0 errors and 0 warnings', () => {
    const validTree: DialogueNode[] = [
      {
        id: 'node_start',
        text: 'Greetings!',
        options: [
          { id: 'opt_1', label: 'Tell me about this place.', seraphtNodeId: 'node_lore' },
          { id: 'opt_2', label: 'Goodbye.', seraphtNodeId: 'exit' },
        ],
      },
      {
        id: 'node_lore',
        text: 'This is the Saints Sanctuary.',
        options: [{ id: 'opt_back', label: 'Thanks.', seraphtNodeId: 'exit' }],
      },
    ];

    const report = lintDialogueTree(validTree);
    expect(report.valid).toBe(true);
    expect(report.errors.length).toBe(0);
    expect(report.warnings.length).toBe(0);
  });

  it('detects broken seraphtNode references pointing to missing nodes', () => {
    const brokenTree: DialogueNode[] = [
      {
        id: 'node_start',
        text: 'Hello!',
        options: [
          { id: 'opt_1', label: 'Take me to secret zone.', seraphtNodeId: 'missing_node_999' },
        ],
      },
    ];

    const report = lintDialogueTree(brokenTree);
    expect(report.valid).toBe(false);
    expect(report.errors.length).toBe(1);
    expect(report.errors[0].code).toBe('MISSING_TARGET_NODE');
    expect(report.errors[0].details?.missingTarget).toBe('missing_node_999');
  });

  it('detects unreachable orphan nodes in the conversation graph', () => {
    const orphanTree: DialogueNode[] = [
      {
        id: 'node_start',
        text: 'Welcome.',
        options: [{ id: 'opt_1', label: 'Bye.', seraphtNodeId: 'exit' }],
      },
      {
        id: 'node_orphan',
        text: 'I am unreachable!',
        options: [{ id: 'opt_2', label: 'Exit.', seraphtNodeId: 'exit' }],
      },
    ];

    const report = lintDialogueTree(orphanTree);
    expect(report.valid).toBe(true); // Warnings don't make it invalid
    expect(report.warnings.length).toBe(1);
    expect(report.warnings[0].code).toBe('UNREACHABLE_NODE');
    expect(report.warnings[0].nodeId).toBe('node_orphan');
  });

  it('detects duplicate node IDs', () => {
    const dupTree: DialogueNode[] = [
      { id: 'node_start', text: 'First start', options: [] },
      { id: 'node_start', text: 'Second start', options: [] },
    ];

    const report = lintDialogueTree(dupTree);
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.code === 'DUPLICATE_NODE_ID')).toBe(true);
  });
});
