/**
 * Input Controller System
 * 
 * Reads raw state from InputManager and converts it into game intents.
 * High-level system called by the Game Loop.
 */
import { inputManager } from './InputManager';
import { KEYBINDS } from './InputConstants';
import { useSessionStore } from '../state/useSessionStore';
import { usePlayerStore } from '../state/usePlayerStore';
import { socketManager } from '../net/SocketManager';

export class InputController {
  private lastMoveCommandTime = 0;
  private readonly MOVE_THROTTLE_MS = 150; // Throttle socket emits

  public update(deltaTime: number) {
    const scene = useSessionStore.getState().activeScene;
    
    // Only process player movement input if we're exploring and not typing in chat
    if (scene !== 'exploring') return;
    
    this.processMovement();
  }

  private processMovement() {
    let dx = 0;
    let dy = 0;
    let newDirection = '';

    if (inputManager.isAnyKeyPressed(KEYBINDS.MOVE_UP)) {
      dy = -1;
      newDirection = 'up';
    } else if (inputManager.isAnyKeyPressed(KEYBINDS.MOVE_DOWN)) {
      dy = 1;
      newDirection = 'down';
    } else if (inputManager.isAnyKeyPressed(KEYBINDS.MOVE_LEFT)) {
      dx = -1;
      newDirection = 'left';
    } else if (inputManager.isAnyKeyPressed(KEYBINDS.MOVE_RIGHT)) {
      dx = 1;
      newDirection = 'right';
    }

    const isMoving = dx !== 0 || dy !== 0;

    // Optional: Implement Client-Side Prediction here instead of just emitting.
    // For Phase 2, we'll keep it simple and emit the intended direction.
    // In Phase 3 (engine rebuild), this will feed into the LocalMovementSystem.

    const now = Date.now();
    const playerStore = usePlayerStore.getState();
    const currentPos = playerStore.player.position;

    // Only emit if moving and throttle
    if (isMoving && now - this.lastMoveCommandTime > this.MOVE_THROTTLE_MS) {
      this.lastMoveCommandTime = now;
      
      // Update local state instantly (prediction)
      playerStore.setPlayerPosition(
        { x: currentPos.x + dx, y: currentPos.y + dy }, 
        newDirection as any, 
        true
      );

      // Emit to server
      socketManager.emit('player_move' as any, {
        x: currentPos.x + dx,
        y: currentPos.y + dy,
        direction: newDirection
      });
    } else if (!isMoving && playerStore.player.isMoving) {
      // Stopped moving
      playerStore.setPlayerPosition(currentPos, undefined, false);
      socketManager.emit('player_move' as any, {
        x: currentPos.x,
        y: currentPos.y,
        direction: playerStore.player.direction
      });
    }
  }
}

export const inputController = new InputController();
