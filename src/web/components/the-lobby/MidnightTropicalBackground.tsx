'use client';

import React from 'react';
import { S3Background } from '@/web/components/landing/s3-background';
import { MidnightStars } from '@/web/components/landing/midnight-stars';
import { S3Water } from '@/web/components/landing/s3-water';
import { S3Palms } from '@/web/components/landing/s3-palms';
import { PixelEnvironmentalEffects } from '@/web/components/landing/pixel-environmental-effects';

interface MidnightTropicalBackgroundProps {
  showPalms?: boolean;
  showWater?: boolean;
  className?: string;
}

export function MidnightTropicalBackground({
  showPalms = true,
  showWater = true,
  className = '',
}: MidnightTropicalBackgroundProps) {
  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden select-none z-0 ${className}`}
      aria-hidden="true"
    >
      {/* ── Background Sky ────── */}
      <S3Background sunClassName="top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 grayscale brightness-200" />

      {/* ── Twinkling Night Sky Stars & Shooting Star ─────────────── */}
      <MidnightStars />

      {/* ── Water with Thin Wavelets & Specular Dash Lights ───────── */}
      {showWater && <S3Water />}

      {/* ── Silhouetted Tropical Palms Frame ──────────────────────── */}
      {showPalms && <S3Palms />}

      {/* ── Midnight Pixel Environmental Particle Effects ─────────── */}
      <PixelEnvironmentalEffects palette="midnight" />

      {/* ── Midnight Color Overlays ────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none z-[25] opacity-80 mix-blend-color"
        style={{ background: 'linear-gradient(to bottom, #03045e, #0077b6)' }}
      />
      <div
        className="absolute inset-0 pointer-events-none z-[25] opacity-50 mix-blend-multiply"
        style={{ background: '#050014' }}
      />
    </div>
  );
}
