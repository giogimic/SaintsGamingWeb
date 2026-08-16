import { describe, it, expect, vi } from 'vitest';
import {
  STUDIO_COMMAND_REGISTRY,
  executeStudioCommand,
  StudioCommandContext,
} from './studioCommands';

describe('Studio Command Palette Actions Engine (Bible 29)', () => {
  it('registers all canonical mode switching commands with shortcuts (Ctrl+1 to Ctrl+5, Ctrl+E)', () => {
    const paintCmd = STUDIO_COMMAND_REGISTRY.find((c) => c.id === 'mode_paint');
    const playCmd = STUDIO_COMMAND_REGISTRY.find((c) => c.id === 'mode_playtest');

    expect(paintCmd?.shortcut).toBe('Ctrl+1');
    expect(playCmd?.shortcut).toBe('Ctrl+E');
  });

  it('executes mode switching commands via executeStudioCommand', () => {
    const mockContext: StudioCommandContext = {
      setStudioMode: vi.fn(),
      triggerSaveMap: vi.fn(),
      showToast: vi.fn(),
    };

    const executed = executeStudioCommand('mode_populate', mockContext);

    expect(executed).toBe(true);
    expect(mockContext.setStudioMode).toHaveBeenCalledWith('npc');
  });

  it('executes map save command', () => {
    const mockContext: StudioCommandContext = {
      setStudioMode: vi.fn(),
      triggerSaveMap: vi.fn(),
    };

    const executed = executeStudioCommand('file_save_map', mockContext);

    expect(executed).toBe(true);
    expect(mockContext.triggerSaveMap).toHaveBeenCalled();
  });

  it('returns false for unknown command IDs', () => {
    const mockContext: StudioCommandContext = {
      setStudioMode: vi.fn(),
      triggerSaveMap: vi.fn(),
    };

    const executed = executeStudioCommand('unknown_action_999', mockContext);
    expect(executed).toBe(false);
  });
});
