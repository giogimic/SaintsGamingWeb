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
import { useGameStore } from '@/web/components/the-lobby/store';

export class InputController {
  public update(_deltaTime: number) {
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
          useGameStore.getState().toggleSystemMenu('keyboard');
          (window as any).__intentionalPointerLockExit = true;
          document.exitPointerLock?.();
        } catch (e) {}
      }
    }

    if (inputManager.consumeKey(KEYBINDS.ATTACK)) {
      // Play Action/Combat sound locally
      import('@/engine/sound-synth').then(({ soundSynth }) => {
        if (soundSynth && soundSynth.playActionSound) {
          soundSynth.playActionSound();
        }
      });
      
      // Dispatch MMO Combat/Attack Input Packet
      Promise.all([
        import('../net/SocketManager'),
        import('../state/useMultiplayerStore'),
        import('../state/usePlayerStore')
      ]).then(([{ socketManager }, { useMultiplayerStore }, { usePlayerStore }]) => {
        const playerPos = usePlayerStore.getState().player.position;
        const playerDir = usePlayerStore.getState().player.direction;
        if (playerPos) {
          const seq = useMultiplayerStore.getState().incrementMoveSeq();
          socketManager.emit('input' as any, {
            type: 'ATTACK',
            sequence: seq,
            x: playerPos.x,
            y: playerPos.y,
            z: playerPos.z,
            direction: playerDir,
            timestamp: Date.now()
          });
        }
      });
    }

    // Camera rotation is now handled directly by CameraManager's update loop
    // Clear delta if we aren't using it to prevent buildup when unlocked
    if (!document.pointerLockElement) {
      inputManager.consumeMouseDelta();
    }
  }
}

export const inputController = new InputController();
