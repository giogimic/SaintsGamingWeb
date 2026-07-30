import React, { useEffect, useState, useRef } from 'react';
import { BabylonEngine } from '@/lib/game/BabylonEngine';
import { useGameStore } from '../store';

interface FloatingHealthBarProps {
  engine: BabylonEngine;
}

export const FloatingHealthBars: React.FC<FloatingHealthBarProps> = ({ engine }) => {
  // map of entityId -> hpPercent
  const [hpMap, setHpMap] = useState<Record<string, number>>({});
  // map of entityId -> screen position {x, y, isVisible}
  const [positions, setPositions] = useState<Record<string, { x: number, y: number, isVisible: boolean }>>({});
  const requestRef = useRef<number>(0);

  useEffect(() => {
    const handleHpUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setHpMap(prev => {
        const next = { ...prev };
        if (detail.hpPercent <= 0) {
          delete next[detail.entityId];
        } else {
          next[detail.entityId] = detail.hpPercent;
        }
        return next;
      });
    };

    window.addEventListener('creature_hp_update_event', handleHpUpdate);
    return () => window.removeEventListener('creature_hp_update_event', handleHpUpdate);
  }, []);

  useEffect(() => {
    const updatePositions = () => {
      const entities = useGameStore.getState().mapEntities;
      const newPos: Record<string, { x: number, y: number, isVisible: boolean }> = {};
      
      for (const entity of entities) {
        if (hpMap[entity.id] !== undefined) {
          const pos = engine.getEntityScreenPosition(entity.id);
          if (pos) {
            newPos[entity.id] = pos;
          }
        }
      }
      
      setPositions(newPos);
      requestRef.current = requestAnimationFrame(updatePositions);
    };

    requestRef.current = requestAnimationFrame(updatePositions);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [engine, hpMap]);

  return (
    <div className="absolute inset-0 pointer-events-none z-[100] overflow-hidden">
      {Object.entries(hpMap).map(([entityId, hpPercent]) => {
        const pos = positions[entityId];
        if (!pos || !pos.isVisible) return null;

        // Health bar color based on percentage
        let color = 'bg-green-500';
        if (hpPercent < 0.5) color = 'bg-[#eab308]'; // yellow
        if (hpPercent < 0.2) color = 'bg-red-500';

        return (
          <div
            key={entityId}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 w-12 h-[6px] bg-black/80 border border-[#806f47] rounded-[2px] shadow-[0_0_4px_rgba(0,0,0,0.8)]"
            style={{ left: pos.x, top: pos.y }}
          >
            <div
              className={`h-full ${color} transition-all duration-200`}
              style={{ width: `${Math.max(0, Math.min(100, hpPercent * 100))}%` }}
            />
          </div>
        );
      })}
    </div>
  );
};
