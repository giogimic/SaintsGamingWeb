import React, { useEffect, useState, useRef } from 'react';
import { BabylonEngine } from '@/engine/BabylonEngine';
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
        const serapht = { ...prev };
        if (detail.hpPercent <= 0) {
          delete serapht[detail.entityId];
        } else {
          serapht[detail.entityId] = detail.hpPercent;
        }
        return serapht;
      });
    };

    window.addEventListener('creature_hp_update_event', handleHpUpdate);
    return () => window.removeEventListener('creature_hp_update_event', handleHpUpdate);
  }, []);

  useEffect(() => {
    // If no active damaged creatures exist, no need to run continuous RAF
    if (Object.keys(hpMap).length === 0) {
      setPositions({});
      return;
    }

    let lastUpdate = 0;
    const updatePositions = (now: number) => {
      if (now - lastUpdate >= 25) {
        lastUpdate = now;
        const entities = useGameStore.getState().mapEntities;
        const newPos: Record<string, { x: number; y: number; isVisible: boolean }> = {};

        for (const entity of entities) {
          if (hpMap[entity.id] !== undefined) {
            const pos = engine.getEntityScreenPosition(entity.id);
            if (pos && pos.isVisible) {
              newPos[entity.id] = pos;
            }
          }
        }

        setPositions(newPos);
      }
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

        let fill = 'bg-[#bef264] shadow-[0_0_8px_rgba(190,242,100,0.6)]'; // > 50%
        if (hpPercent < 0.5) fill = 'bg-[#fbbf24] shadow-[0_0_8px_rgba(251,191,36,0.6)]'; // > 20%
        if (hpPercent < 0.2) fill = 'bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.6)]';

        return (
          <div
            key={entityId}
            className="absolute h-1.5 w-10 -translate-x-1/2 -translate-y-1/2 transform overflow-hidden rounded-sm bg-black/60 border border-[#22d3ee]/20"
            style={{ left: pos.x, top: pos.y }}
          >
            <div
              className={`h-full transition-all duration-200 ${fill}`}
              style={{
                width: `${Math.max(0, Math.min(100, hpPercent * 100))}%`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
