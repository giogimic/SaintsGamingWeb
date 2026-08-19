'use client';

import React, { useState } from 'react';
import { getThumbnailFrameRect } from '@/shared/game/assetSheets';

export interface SpriteThumbnailProps {
  src: string;
  alt: string;
  /** LPC-standard cell size used to compute the representative frame. */
  cellSize?: number;
  className?: string;
}

/**
 * Renders a single representative frame (the south-facing walk frame on a
 * standard LPC grid) instead of squashing an entire multi-row spritesheet
 * into a tiny gallery card. Detects the image's natural pixel dimensions on
 * load rather than trusting potentially-inaccurate stored metadata, so it
 * works for both freshly uploaded assets and the existing bundled catalog.
 *
 * Falls back to rendering the plain image whenever the source isn't a
 * multi-frame sheet (or dimensions can't be determined).
 */
export function SpriteThumbnail({ src, alt, cellSize = 64, className }: SpriteThumbnailProps) {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  // First paint: load the image normally so we can measure its natural size.
  // Once loaded, we decide whether cropping to a single frame is appropriate.
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

  const rect = getThumbnailFrameRect(naturalSize.width, naturalSize.height, cellSize, cellSize);
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
