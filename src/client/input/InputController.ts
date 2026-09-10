/**
 * Input Controller System
 * 
 * Reads raw state from InputManager and converts it into game intents.
 * High-level system called by the Game Loop.
 */
import { inputManager } from './InputManager';
import { KEYBINDS } from './InputConstants';
import { useSessionStore } from '../state/useSessionStore';

export class InputController {
  public update(deltaTime: number) {
    const scene = useSessionStore.getState().activeScene;
    
    // Only process player input if we're exploring
    if (scene !== 'exploring') return;
    
    // In the future, this is where we check for UI toggles like inventory (I),
    // map (M), or escaping menus. Movement is handled purely by the Physics systems.
  }
}

export const inputController = new InputController();
