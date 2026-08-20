'use client';

import React, { useState, useEffect } from 'react';
import { getThumbnailFrameRect } from '@/shared/game/assetSheets';

export interface CharacterSpritePreviewProps {
  spriteKey?: string;
  layers?: string[];
  spriteBundleId?: string | null;
  className?: string;
  size?: number;
  scale?: number;
}

/**
 * Resolves an asset identifier or path to an absolute public URL.
 */
export function resolveSpriteUrl(key: string): string {
  if (!key) return '/game-assets/npc/adventurer.png';
  if (key.startsWith('/') || key.startsWith('http://') || key.startsWith('https://')) {
    return key;
  }
  if (key.startsWith('game-assets/')) {
    return `/${key}`;
  }
  if (key.startsWith('npc/') || key.startsWith('monster/') || key.startsWith('creatures/') || key.startsWith('objects/')) {
    return `/game-assets/${key.endsWith('.png') ? key : `${key}.png`}`;
  }
  if (key.includes('.') || key.startsWith('upload_') || key.startsWith('asset_')) {
    return `/uploads/${key}`;
  }
  // Check if it matches an LPC directory pack name
  const lpcDirs = [
    'good-paladin-templar-female',
    'good-cleric-highpriestess-female',
    'good-cleric-sanctuary-male',
    'good-ranger-grovekeeper-female',
    'good-wizard-archmage-male',
    'good-wizard-celestial-female',
    'evil-assassin-nightstalker-female',
    'evil-berserker-bloodaxe-male',
    'item-armor-plate-iron',
    'item-armor-plate-steel',
    'item-backpack-leather',
    'item-boots-rim-black',
    'item-bracers-steel',
    'item-cape-blue',
    'item-cape-crimson',
    'item-cape-forest-green',
    'item-cape-purple',
    'item-cape-white',
    'item-hat-hood-green',
    'item-hat-hood-white',
    'item-hat-horned-iron',
    'item-hat-tricorne-black',
  ];
  if (lpcDirs.includes(key)) {
    return `/game-assets/npc/${key}/${key}.png`;
  }
  return `/game-assets/npc/${key}.png`;
}

/**
 * Universal character sprite preview component.
 * Supports:
 * - Single sprites or full layered modular LPC stacks (e.g. Base + Cape + Hat)
 * - Intelligent frame calculation (Front idle / walk frame)
 * - Non-destructive pixelated scaling
 */
export function CharacterSpritePreview({
  spriteKey,
  layers,
  spriteBundleId,
  className,
  size = 32,
  scale = 1.5,
}: CharacterSpritePreviewProps) {
  const activeLayers = (layers && layers.length > 0)
    ? layers.filter(Boolean)
    : spriteKey
    ? [spriteKey]
    : ['adventurer'];

  const baseSrc = resolveSpriteUrl(activeLayers[0]);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setNaturalSize(null);
    setFailed(false);
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
          setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
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

