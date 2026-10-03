import React, { useEffect, useRef } from 'react';
import { engineCore } from '../engine/EngineCore';
import { useHudStore } from '../state/useHudStore';
import { useWorldStore } from '../state/useWorldStore';
import { useGameStore } from '@/web/components/the-lobby/store';
import { inputManager } from '../input/InputManager';
import { KEYBINDS } from '../input/InputConstants';
import { isGameplayInputBlocked, matchesInputBinding, releaseGameplayCursor, toggleGameplayCursor } from '../input/gameplayControls';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ownedPointerLock = document.pointerLockElement === canvas;
    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === canvas;
      const releasedOurLock = ownedPointerLock && !locked;
      ownedPointerLock = locked;
      canvas.style.cursor = locked ? 'none' : 'default';
      inputManager.consumeMouseDelta();
      if (locked) {
        (window as any).__intentionalPointerLockExit = false;
        // A menu or text field may open while an asynchronous request completes.
        if (isGameplayInputBlocked()) releaseGameplayCursor(canvas);
      } else if (releasedOurLock) {
        const intentional = (window as any).__intentionalPointerLockExit;
        (window as any).__intentionalPointerLockExit = false;
        if (!intentional && !useGameStore.getState().isSystemMenuOpen) {
          useGameStore.getState().openSystemMenu('keyboard');
        }
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      // Handle Escape before the browser unlock and frame-polled menu toggle race.
      if (event.key === 'Escape' && document.pointerLockElement === canvas) {
        event.preventDefault();
        event.stopImmediatePropagation();
        releaseGameplayCursor(canvas);
        useGameStore.getState().openSystemMenu('keyboard');
        return;
      }
      if (event.ctrlKey || event.altKey || event.metaKey || isGameplayInputBlocked()) return;
      if (!KEYBINDS.TOGGLE_CURSOR.some((binding) => matchesInputBinding(event, binding))) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleGameplayCursor(canvas);
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (event.defaultPrevented || !KEYBINDS.TOGGLE_CURSOR.some((binding) => matchesInputBinding(event, binding))) return;
      event.preventDefault(); // Prevent middle-button browser autoscroll.
      event.stopImmediatePropagation();
      toggleGameplayCursor(canvas);
    };
    const releaseForUi = () => {
      if (document.pointerLockElement === canvas && isGameplayInputBlocked()) releaseGameplayCursor(canvas);
    };
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('focusin', releaseForUi);
    window.addEventListener('keydown', handleKeyDown, true);
    canvas.addEventListener('pointerdown', handlePointerDown, true);
    const unsubscribeGame = useGameStore.subscribe(releaseForUi);
    const unsubscribeHud = useHudStore.subscribe(releaseForUi);
    const unsubscribeWorld = useWorldStore.subscribe(releaseForUi);
    engineCore.initialize(canvas);

    return () => {
      unsubscribeGame();
      unsubscribeHud();
      unsubscribeWorld();
      releaseGameplayCursor(canvas);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('focusin', releaseForUi);
      window.removeEventListener('keydown', handleKeyDown, true);
      canvas.removeEventListener('pointerdown', handlePointerDown, true);
      engineCore.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block focus:outline-none"
      style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0, touchAction: 'none' }}
      id="game-canvas"
      tabIndex={0}
    />
  );
}
