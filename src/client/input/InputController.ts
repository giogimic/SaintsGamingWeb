/**
 * Input Controller System
 * 
 * Reads raw state from InputManager and converts it into game intents.
 * High-level system called by the Game Loop.
 */
import { inputManager } from './InputManager';
import { KEYBINDS } from './InputConstants';
import { useSessionStore } from '../state/useSessionStore';
import { useHudStore } from '../state/useHudStore';

export class InputController {
  public update(deltaTime: number) {
    const scene = useSessionStore.getState().activeScene;
    
    // Only process player input if we're exploring
    if (scene !== 'exploring') return;
    
    // Handle Global Menu (ESC)
    if (inputManager.consumeKey(KEYBINDS.MENU)) {
      const hud = useHudStore.getState();
      const openWins = hud.openWindows;
      if (openWins.length > 0) {
        // Close the top-most window
        hud.toggleWindow(openWins[openWins.length - 1]);
      } else {
        // If no windows open, open options
        hud.toggleWindow('options');
      }
    }
  }
}

export const inputController = new InputController();
