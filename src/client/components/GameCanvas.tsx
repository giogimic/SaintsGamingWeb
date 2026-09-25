import React, { useEffect, useRef } from 'react';
import { engineCore } from '../engine/EngineCore';
import { useHudStore } from '../state/useHudStore';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const handlePointerLockChange = () => {
      if (!document.pointerLockElement) {
        try {
          const { useGameStore } = require('@/web/components/the-lobby/store');
          if (!useGameStore.getState().isSystemMenuOpen) {
            useGameStore.getState().setIsSystemMenuOpen(true);
          }
        } catch (e) {}
      }
    };
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    if (canvasRef.current) {
      engineCore.initialize(canvasRef.current);
    }
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      engineCore.dispose();
    };
  }, []);

  const handleClick = () => {
    if (!canvasRef.current) return;
    const isHudMenuOpen = useHudStore.getState().openWindows.length > 0;
    
    // Check legacy system menu state
    let isSystemMenuOpen = false;
    try {
      const { useGameStore } = require('@/web/components/the-lobby/store');
      isSystemMenuOpen = useGameStore.getState().isSystemMenuOpen;
    } catch (e) {}

    if (!isHudMenuOpen && !isSystemMenuOpen) {
      canvasRef.current.requestPointerLock?.();
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block focus:outline-none"
      style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0, touchAction: 'none' }}
      id="game-canvas"
      onClick={handleClick}
    />
  );
}
