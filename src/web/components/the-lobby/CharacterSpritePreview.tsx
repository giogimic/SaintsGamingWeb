'use client';

import React, { useState, useEffect } from 'react';
import { getThumbnailFrameRect } from '@/shared/game/assetSheets';

export interface CharacterSpritePreviewProps {
  spriteKey: string;
  spriteBundleId?: string | null;
  className?: string;
  size?: number;
  scale?: number;
}

/**
 * Universal character sprite preview component.
 * Intelligently renders:
 * - Full LPC character sheets (832×1344) -> South-facing (Front) idle frame (Row 10)
 * - LPC walk sheets (576×256) -> South-facing (Front) walk frame (Row 2)
 * - Classic 3×4 Tuxemon sheets (96×128, 48×128) -> South-facing (Front) idle frame (Row 0)
 * - Single-frame portraits/icons -> full centered image
 * - Direct upload paths (`/uploads/...`), full URLs, or named presets (`/game-assets/npc/...`)
 */
export function CharacterSpritePreview({
  spriteKey,
  spriteBundleId,
  className,
  size = 32,
  scale = 1.5,
}: CharacterSpritePreviewProps) {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [failed, setFailed] = useState(false);

  // Determine image source URL
  const resolveSrc = (key: string): string => {
    if (!key) return '/game-assets/npc/adventurer.png';
    if (key.startsWith('/') || key.startsWith('http://') || key.startsWith('https://')) {
      return key;
    }
    if (key.includes('.')) {
      return `/uploads/${key}`;
    }
    return `/game-assets/npc/${key}.png`;
  };

  const src = resolveSrc(spriteKey);

  useEffect(() => {
    setNaturalSize(null);
    setFailed(false);
  }, [src]);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center text-[10px] text-slate-500 font-mono ${className || ''}`}
        style={{ width: `${size * scale}px`, height: `${size * scale}px` }}
      >
        ?
      </div>
    );
  }

  // Initial render: measure natural dimensions
  if (!naturalSize) {
    return (
      <img
        src={src}
        alt={spriteKey}
        className={className}
        style={{
          width: `${size * scale}px`,
          height: `${size * scale}px`,
          objectFit: 'contain',
          imageRendering: 'pixelated',
        }}
        onLoad={(e) => {
          const img = e.currentTarget;
          setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
        }}
        onError={() => setFailed(true)}
      />
    );
  }

  // Calculate standard frame crop rect
  const cellSize = naturalSize.width >= 576 ? 64 : 32;
  const rect = getThumbnailFrameRect(naturalSize.width, naturalSize.height, cellSize, cellSize);
  const isCropped = rect.width < naturalSize.width || rect.height < naturalSize.height;

  if (!isCropped) {
    return (
      <img
        src={src}
        alt={spriteKey}
        className={className}
        style={{
          width: `${size * scale}px`,
          height: `${size * scale}px`,
          objectFit: 'contain',
          imageRendering: 'pixelated',
        }}
        onError={() => setFailed(true)}
      />
    );
  }

  const zoomFactor = (size / cellSize) * scale;

  return (
    <div
      role="img"
      aria-label={spriteKey}
      className={className}
      style={{
        width: `${rect.width * zoomFactor}px`,
        height: `${rect.height * zoomFactor}px`,
        backgroundImage: `url(${src})`,
        backgroundPosition: `-${rect.x * zoomFactor}px -${rect.y * zoomFactor}px`,
        backgroundSize: `${naturalSize.width * zoomFactor}px ${naturalSize.height * zoomFactor}px`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
      }}
    />
  );
}
