/**
 * Game Canvas Component
 * 
 * Mounts the Babylon.js engine via EngineCore.
 */
import React, { useEffect, useRef } from 'react';
import { engineCore } from '../engine/EngineCore';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      engineCore.initialize(canvasRef.current);
    }
    return () => {
      engineCore.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block focus:outline-none"
      style={{ touchAction: 'none' }}
      id="game-canvas"
    />
  );
}
