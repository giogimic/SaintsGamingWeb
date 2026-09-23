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
        // Fallback to legacy game store for the system menu until fully ported
        try {
          const { useGameStore } = require('@/web/components/the-lobby/store');
          useGameStore.getState().toggleSystemMenu('keyboard');
          document.exitPointerLock?.();
        } catch (e) {}
      }
    }

    // Camera Rotation via Mouse Delta (when pointer is locked)
    if (document.pointerLockElement && document.pointerLockElement === inputManager.getCanvas()) {
      const delta = inputManager.consumeMouseDelta();
      if (delta.x !== 0 || delta.y !== 0) {
        try {
          const { cameraManager } = require('../engine/CameraManager');
          if (cameraManager.settings.playerCameraStyle === 'free' || cameraManager.settings.playerCameraStyle === 'firstperson') {
            cameraManager.yaw += delta.x * 0.002 * cameraManager.settings.orbitSensitivity;
            cameraManager.pitch += delta.y * 0.002 * cameraManager.settings.orbitSensitivity;
            
            // Clamp pitch to prevent camera flipping
            cameraManager.pitch = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, cameraManager.pitch));
          }
        } catch (e) {}
      }
    } else {
      // Clear delta if we aren't using it to prevent buildup when unlocked
      inputManager.consumeMouseDelta();
    }
  }
}

export const inputController = new InputController();
