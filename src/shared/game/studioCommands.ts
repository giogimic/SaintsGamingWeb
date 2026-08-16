/**
 * Saints Gaming — Studio Command Palette & Action Registry (Bible 29 & Bible 19)
 * Declarative registry of keyboard shortcuts and executable studio creator commands.
 */

import { StudioMode } from './studioModes';

export type CommandCategory = 'mode' | 'file' | 'tool' | 'diagnostic';

export interface StudioCommandContext {
  setStudioMode: (mode: StudioMode) => void;
  triggerSaveMap: () => void;
  openModal?: (modalId: string) => void;
  runLinter?: () => void;
  showToast?: (message: string) => void;
}

export interface StudioCommand {
  id: string;
  title: string;
  category: CommandCategory;
  shortcut?: string;
  description?: string;
  execute: (context: StudioCommandContext) => void;
}

export const STUDIO_COMMAND_REGISTRY: StudioCommand[] = [
  // 1. Mode Switching Hotkeys (Bible 29 §2)
  {
    id: 'mode_paint',
    title: 'Switch to Paint Mode',
    category: 'mode',
    shortcut: 'Ctrl+1',
    description: 'Author terrain, tilesets, and logic layers',
    execute: (ctx) => {
      ctx.setStudioMode('develop');
      ctx.showToast?.('Switched to Paint mode');
    },
  },
  {
    id: 'mode_populate',
    title: 'Switch to Populate Mode',
    category: 'mode',
    shortcut: 'Ctrl+2',
    description: 'Place NPCs, spawners, and entity actors',
    execute: (ctx) => {
      ctx.setStudioMode('npc');
      ctx.showToast?.('Switched to Populate mode');
    },
  },
  {
    id: 'mode_script',
    title: 'Switch to Script Mode',
    category: 'mode',
    shortcut: 'Ctrl+3',
    description: 'Author quests, dialogue trees, and triggers',
    execute: (ctx) => {
      ctx.setStudioMode('quest');
      ctx.showToast?.('Switched to Script mode');
    },
  },
  {
    id: 'mode_catalog',
    title: 'Switch to Catalog Mode',
    category: 'mode',
    shortcut: 'Ctrl+4',
    description: 'Edit creature defs, loot tables, and items',
    execute: (ctx) => {
      ctx.setStudioMode('creature');
      ctx.showToast?.('Switched to Catalog mode');
    },
  },
  {
    id: 'mode_atlas',
    title: 'Switch to Atlas Mode',
    category: 'mode',
    shortcut: 'Ctrl+5',
    description: 'Connect maps visually in the world atlas',
    execute: (ctx) => {
      ctx.setStudioMode('atlas');
      ctx.showToast?.('Switched to Atlas mode');
    },
  },
  {
    id: 'mode_playtest',
    title: 'Toggle Playtest Mode',
    category: 'mode',
    shortcut: 'Ctrl+E',
    description: 'Playtest movement, encounters, and gameplay',
    execute: (ctx) => {
      ctx.setStudioMode('test');
      ctx.showToast?.('Playtest mode active');
    },
  },

  // 2. File & Persistence Commands
  {
    id: 'file_save_map',
    title: 'Save Map',
    category: 'file',
    shortcut: 'Ctrl+S',
    description: 'Persist current map tiles, logic, and entities',
    execute: (ctx) => {
      ctx.triggerSaveMap();
      ctx.showToast?.('Saving active map...');
    },
  },
  {
    id: 'file_new_map',
    title: 'Create New Map',
    category: 'file',
    shortcut: 'Ctrl+N',
    description: 'Open the new world map creation modal',
    execute: (ctx) => {
      ctx.openModal?.('new_map');
    },
  },

  // 3. Diagnostics & Quality
  {
    id: 'diag_lint_world',
    title: 'Lint World Connectivity',
    category: 'diagnostic',
    description: 'Check for broken gates, out-of-bounds spawns, and traps',
    execute: (ctx) => {
      ctx.runLinter?.();
      ctx.showToast?.('Running world connectivity linter...');
    },
  },
];

/**
 * Executes a studio command by ID.
 */
export function executeStudioCommand(
  commandId: string,
  context: StudioCommandContext
): boolean {
  const cmd = STUDIO_COMMAND_REGISTRY.find((c) => c.id === commandId);
  if (!cmd) return false;
  cmd.execute(context);
  return true;
}
