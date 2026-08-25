'use client';

import React, { useState } from 'react';
import { getThumbnailFrameRect } from '@/shared/game/assetSheets';

export interface SpriteThumbnailProps {
  src: string;
  alt: string;
  /** Modular-standard cell size used to compute the representative frame. */
  cellSize?: number;
  /** Explicit atlas frame bounding box if this asset is a sliced sub-region */
  atlasFrame?: { x: number; y: number; width?: number; height?: number; w?: number; h?: number } | null;
  className?: string;
}

/**
 * Renders a single representative frame (or explicit atlas frame) instead of squashing
 * an entire multi-row spritesheet into a tiny gallery card. Detects the image's natural
 * pixel dimensions on load.
 */
export function SpriteThumbnail({ src, alt, cellSize = 64, atlasFrame, className }: SpriteThumbnailProps) {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  // First paint: load the image normally so we can measure its natural size.
  if (!naturalSize) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ imageRendering: 'pixelated' }}
        onLoad={(e) => {
          const img = e.currentTarget;
          setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
        }}
        onError={() => setFailed(true)}
      />
    );
  }

  let rect = { x: 0, y: 0, width: naturalSize.width, height: naturalSize.height };
  if (atlasFrame) {
    rect = {
      x: atlasFrame.x,
      y: atlasFrame.y,
      width: atlasFrame.width ?? atlasFrame.w ?? cellSize,
      height: atlasFrame.height ?? atlasFrame.h ?? cellSize,
    };
  } else {
    rect = getThumbnailFrameRect(naturalSize.width, naturalSize.height, cellSize, cellSize);
  }

  const isCropped = rect.width < naturalSize.width || rect.height < naturalSize.height;

  if (!isCropped) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ imageRendering: 'pixelated' }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className={className}
      style={{
        width: rect.width,
        height: rect.height,
        backgroundImage: `url(${src})`,
        backgroundPosition: `-${rect.x}px -${rect.y}px`,
        backgroundSize: `${naturalSize.width}px ${naturalSize.height}px`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
      }}
    />
  );
}

