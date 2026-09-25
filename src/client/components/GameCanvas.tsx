import React, { useEffect, useRef } from 'react';
import { engineCore } from '../engine/EngineCore';
import { useHudStore } from '../state/useHudStore';
import { useGameStore } from '@/web/components/the-lobby/store';
import { cameraManager } from '../engine/CameraManager';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const handlePointerLockChange = () => {
      if (!document.pointerLockElement) {
        try {
          if (!useGameStore.getState().isSystemMenuOpen) {
            useGameStore.getState().openSystemMenu('keyboard');
          }
        } catch (_e) {}
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
      isSystemMenuOpen = useGameStore.getState().isSystemMenuOpen;
    } catch (e) {}

    if (!isHudMenuOpen && !isSystemMenuOpen) {
      let isFirstPersonOrThirdPerson = false;
      try {
        const style = cameraManager.settings.playerCameraStyle;
        const currentZoom = cameraManager.currentZoom;
        
        isFirstPersonOrThirdPerson = 
          style === 'firstperson' || 
          style === 'follow45' || 
          style === 'free' || 
          (style === 'dynamic' && currentZoom < 12.0);
      } catch (e) {}

      if (isFirstPersonOrThirdPerson) {
        canvasRef.current.requestPointerLock?.();
      }
    }
  };


  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block focus:outline-none"
      style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0, touchAction: 'none' }}
      id="game-canvas"
      onClick={handleClick}
    />
  );
}
