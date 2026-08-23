'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
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
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLight = mounted && theme === 'light';
  const isVice = mounted && (theme === 'vice' || theme === 'hacker');

  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden select-none z-0 ${className}`}
      aria-hidden="true"
    >
      {/* ── Background Sky & Radiant Sun ────── */}
      <S3Background
        sunClassName={
          isLight
            ? 'top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2'
            : isVice
            ? 'top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2'
            : 'top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 grayscale brightness-200'
        }
      />

      {/* ── Twinkling Night Sky Stars & Shooting Star (Dark mode only) ── */}
      {!isLight && !isVice && <MidnightStars />}

      {/* ── Water with Thin Wavelets & Specular Dash Lights ───────── */}
      {showWater && <S3Water />}

      {/* ── Silhouetted Tropical Palms Frame ──────────────────────── */}
      {showPalms && <S3Palms />}

      {/* ── Pixel Environmental Particle Effects ─────────── */}
      <PixelEnvironmentalEffects palette={isLight || isVice ? 'sunset' : 'midnight'} />

      {/* ── Dynamic Color Overlays for Atmosphere ──────────────────── */}
      {isLight ? (
        <div
          className="absolute inset-0 pointer-events-none z-[25] opacity-70 mix-blend-multiply"
          style={{ background: 'radial-gradient(circle at 50% 50%, transparent 40%, #10002b 100%)' }}
        />
      ) : isVice ? (
        <div
          className="absolute inset-0 pointer-events-none z-[25] opacity-40 mix-blend-color"
          style={{ background: 'linear-gradient(to bottom, #d946ef, #fb923c)' }}
        />
      ) : (
        <>
          <div
            className="absolute inset-0 pointer-events-none z-[25] opacity-80 mix-blend-color"
            style={{ background: 'linear-gradient(to bottom, #03045e, #0077b6)' }}
          />
          <div
            className="absolute inset-0 pointer-events-none z-[25] opacity-50 mix-blend-multiply"
            style={{ background: '#050014' }}
          />
        </>
      )}
    </div>
  );
}
