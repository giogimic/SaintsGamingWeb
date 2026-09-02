'use client';

import React, { useState, useEffect } from 'react';
import { getThumbnailFrameRect } from '@/shared/game/assetSheets';

export interface CharacterSpritePreviewProps {
  assetProfileId?: string;
  layers?: string[];
  assetBundleId?: string | null;
  className?: string;
  size?: number;
  scale?: number;
}

/**
 * Resolves an asset identifier or path to an absolute public URL.
 */
export function resolveSpriteUrl(key: string): string {
  if (!key) return '/game-assets/npc/adventurer.png';
  const trimmed = key.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('game-assets/')) {
    return `/${trimmed}`;
  }
  if (trimmed.startsWith('npc/') || trimmed.startsWith('monster/') || trimmed.startsWith('creatures/') || trimmed.startsWith('objects/')) {
    return `/game-assets/${trimmed.endsWith('.png') ? trimmed : `${trimmed}.png`}`;
  }
  if (trimmed.startsWith('uploads/')) {
    return `/${trimmed}`;
  }
  if (trimmed.startsWith('upload_') || trimmed.startsWith('asset_custom_')) {
    return `/uploads/${trimmed.endsWith('.png') ? trimmed : `${trimmed}.png`}`;
  }
  const clean = trimmed.replace(/\.png$/i, '');
  return `/game-assets/npc/${clean}.png`;
}

const SPRITE_SIZE_CACHE = new Map<string, { width: number; height: number }>();

/**
 * Universal character sprite preview component.
 * Supports:
 * - Single sprites or full layered modular stacks (e.g. Base + Cape + Hat)
 * - Intelligent frame calculation (Front idle / walk frame)
 * - Non-destructive pixelated scaling
 */
export function CharacterSpritePreview({
  assetProfileId,
  layers,
  assetBundleId,
  className,
  size = 32,
  scale = 1.5,
}: CharacterSpritePreviewProps) {
  const activeLayers = (layers && layers.length > 0)
    ? layers.filter(Boolean)
    : assetProfileId
    ? [assetProfileId]
    : ['adventurer'];

  const baseSrc = resolveSpriteUrl(activeLayers[0]);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(
    () => SPRITE_SIZE_CACHE.get(baseSrc) || null
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const cached = SPRITE_SIZE_CACHE.get(baseSrc);
    if (cached) {
      setNaturalSize(cached);
      setFailed(false);
    } else {
      setNaturalSize(null);
      setFailed(false);
    }
  }, [baseSrc]);

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

  // Initial measurement
  if (!naturalSize) {
    return (
      <img
        src={baseSrc}
        alt={activeLayers[0]}
        className={className}
        style={{
          width: `${size * scale}px`,
          height: `${size * scale}px`,
          objectFit: 'contain',
          imageRendering: 'pixelated',
        }}
        onLoad={(e) => {
          const img = e.currentTarget;
          const dims = { width: img.naturalWidth, height: img.naturalHeight };
          SPRITE_SIZE_CACHE.set(baseSrc, dims);
          setNaturalSize(dims);
        }}
        onError={() => setFailed(true)}
      />
    );
  }

  const cellSize = naturalSize.width >= 576 ? 64 : 32;
  const rect = getThumbnailFrameRect(naturalSize.width, naturalSize.height, cellSize, cellSize);
  const isCropped = rect.width < naturalSize.width || rect.height < naturalSize.height;

  if (!isCropped && activeLayers.length === 1) {
    return (
      <img
        src={baseSrc}
        alt={activeLayers[0]}
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
  const frameWidth = rect.width * zoomFactor;
  const frameHeight = rect.height * zoomFactor;

  return (
    <div
      className={`relative select-none overflow-hidden ${className || ''}`}
      style={{
        width: `${frameWidth}px`,
        height: `${frameHeight}px`,
      }}
    >
      {activeLayers.map((layerKey, idx) => {
        const layerSrc = resolveSpriteUrl(layerKey);
        return (
          <div
            key={`${layerKey}-${idx}`}
            role="img"
            aria-label={layerKey}
            className="absolute inset-0 pointer-events-none"
            style={{
              width: `${frameWidth}px`,
              height: `${frameHeight}px`,
              backgroundImage: `url(${layerSrc})`,
              backgroundPosition: `-${rect.x * zoomFactor}px -${rect.y * zoomFactor}px`,
              backgroundSize: `${naturalSize.width * zoomFactor}px ${naturalSize.height * zoomFactor}px`,
              backgroundRepeat: 'no-repeat',
              imageRendering: 'pixelated',
            }}
          />
        );
      })}
    </div>
  );
}

