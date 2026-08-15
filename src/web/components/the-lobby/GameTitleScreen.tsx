'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from './store';
import { Play, ScrollText, Settings, Volume2, VolumeX, LogOut } from 'lucide-react';
import { useSession } from 'next-auth/react';
import GameOptionsMenu from './hud/GameOptionsMenu';
import { useEditorStore } from './editor/editor-store';
import { soundSynth } from '@/engine/sound-synth';

// Simple animated canvas background — floating runic particles
function TitleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛜ', 'ᛞ', 'ᛟ'];

    type Particle = {
      x: number; y: number; vy: number; vx: number;
      size: number; alpha: number; rune: string;
      pulse: number; pulseSpeed: number;
    };

    const particles: Particle[] = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vy: -(0.15 + Math.random() * 0.35),
      vx: (Math.random() - 0.5) * 0.2,
      size: 10 + Math.random() * 16,
      alpha: 0.06 + Math.random() * 0.18,
      rune: RUNES[Math.floor(Math.random() * RUNES.length)],
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.005 + Math.random() * 0.01,
    }));

    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Deep space gradient
      const grad = ctx.createRadialGradient(
        canvas.width * 0.5, canvas.height * 0.4, 0,
        canvas.width * 0.5, canvas.height * 0.4, canvas.width * 0.7
      );
      grad.addColorStop(0, 'rgba(76, 29, 149, 0.35)');
      grad.addColorStop(0.5, 'rgba(15, 5, 35, 0.8)');
      grad.addColorStop(1, 'rgba(5, 0, 15, 1)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Star field
      for (let i = 0; i < 120; i++) {
        const sx = ((i * 173.13 + 77) % canvas.width);
        const sy = ((i * 311.7 + 53) % canvas.height);
        const brightness = 0.3 + (Math.sin(Date.now() * 0.001 + i) + 1) * 0.35;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7 + (i % 3) * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${brightness * 0.6})`;
        ctx.fill();
      }

      // Runic particles
      particles.forEach(p => {
        p.pulse += p.pulseSpeed;
        const pulseAlpha = p.alpha + Math.sin(p.pulse) * 0.06;
        ctx.font = `${p.size}px serif`;
        ctx.fillStyle = `rgba(167, 139, 250, ${Math.max(0, pulseAlpha)})`;
        ctx.fillText(p.rune, p.x, p.y);

        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -30) {
          p.y = canvas.height + 20;
          p.x = Math.random() * canvas.width;
        }
      });

      // Horizontal scan line (subtle)
      const scanY = ((Date.now() * 0.04) % (canvas.height + 80)) - 40;
      const scanGrad = ctx.createLinearGradient(0, scanY - 40, 0, scanY + 40);
      scanGrad.addColorStop(0, 'rgba(139, 92, 246, 0)');
      scanGrad.addColorStop(0.5, 'rgba(139, 92, 246, 0.04)');
      scanGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 40, canvas.width, 80);

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

// Credits modal
function CreditsModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 z-[200] flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div
          className="rounded-2xl border border-violet-500/30 p-8 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(15,5,35,0.97) 0%, rgba(30,10,60,0.97) 100%)',
            boxShadow: '0 0 60px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.07)',
          }}
        >
          <div className="absolute -top-px left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />

          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-violet-300 to-fuchsia-400 mb-1 tracking-widest">
            CREDITS
          </h2>
          <p className="text-violet-500/60 text-xs tracking-widest uppercase mb-6">Saints Gaming</p>

          <div className="space-y-4 text-sm">
            {[
              { role: 'Game Director', name: 'The Saints Team' },
              { role: 'Engine & Architecture', name: 'BabylonJS / Next.js' },
              { role: 'Character Sprites', name: 'Tuxemon Project' },
              { role: 'Tile Art', name: 'LPC Community' },
              { role: 'Sound Design', name: 'Community Contributors' },
            ].map(c => (
              <div key={c.role} className="flex items-center justify-between border-b border-violet-900/40 pb-3">
                <span className="text-violet-400/60 text-xs uppercase tracking-widest">{c.role}</span>
                <span className="text-violet-100 font-bold text-xs">{c.name}</span>
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            className="mt-8 px-8 py-2.5 bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 rounded-xl text-violet-200 text-sm font-bold tracking-wider transition-all hover:border-violet-400/60"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GameTitleScreen() {
  const { data: session, status } = useSession();
  const setGameMode = useGameStore((state) => state.setGameMode);
  const [showCredits, setShowCredits] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLogoVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleStart = () => {
    soundSynth?.playActionSound?.();
    if (status === 'authenticated') {
      setGameMode('SERVER_SELECT');
    } else {
      setGameMode('LOGIN');
    }
  };

  return (
    <div className="pointer-events-auto absolute inset-0 z-[200] overflow-hidden" style={{ background: '#05000f' }}>
      <TitleBackground />

      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)' }}
      />

      {/* Bottom fog */}
      <div
        className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(5,0,15,0.9) 0%, transparent 100%)' }}
      />

      {/* Mute + account + leave */}
      <button
        onClick={() => setIsMuted(m => !m)}
        className="absolute top-4 left-4 z-20 p-2.5 rounded-xl border border-violet-900/40 text-violet-400/50 hover:text-violet-300 hover:border-violet-500/40 transition-all"
        style={{ background: 'rgba(10,5,25,0.6)', backdropFilter: 'blur(8px)' }}
      >
        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>

      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {status === 'authenticated' && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-violet-800/40"
            style={{ background: 'rgba(10,5,25,0.7)', backdropFilter: 'blur(8px)' }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-violet-300 font-mono">
              {session?.user?.name || session?.user?.username || 'Tamer'}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            window.location.href = '/';
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/40 text-rose-200 hover:bg-rose-900/50 hover:text-white transition-all font-mono text-xs font-bold uppercase tracking-wider"
          style={{ background: 'rgba(10,5,25,0.7)', backdropFilter: 'blur(8px)' }}
          title="Return to the Saints Gaming website"
        >
          <LogOut size={14} />
          Leave
        </button>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full pb-16">

        {/* Logo block */}
        <div
          className="flex flex-col items-center mb-16 transition-all duration-1000"
          style={{
            opacity: logoVisible ? 1 : 0,
            transform: logoVisible ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          {/* Top decorative line */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-[1px] w-24 bg-gradient-to-r from-transparent to-violet-500/60" />
            <span className="text-violet-500/50 text-xs tracking-[0.5em] font-mono uppercase">Est. 2025</span>
            <div className="h-[1px] w-24 bg-gradient-to-l from-transparent to-violet-500/60" />
          </div>

          {/* Main title */}
          <h1
            className="text-[7rem] font-black leading-none tracking-[0.08em] select-none"
            style={{
              fontFamily: 'serif',
              background: 'linear-gradient(180deg, #e8d5ff 0%, #c084fc 35%, #a855f7 65%, #7c3aed 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 40px rgba(139,92,246,0.6)) drop-shadow(0 0 80px rgba(139,92,246,0.3))',
            }}
          >
            SAINTS
          </h1>

          {/* Subtitle */}
          <div className="flex items-center gap-3 mt-1">
            <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-fuchsia-500/60" />
            <h2 className="text-fuchsia-300/70 text-lg font-bold tracking-[0.6em] uppercase font-mono">
              Online
            </h2>
            <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-fuchsia-500/60" />
          </div>

          {/* Tagline */}
          <p className="mt-4 text-violet-400/40 text-xs tracking-[0.3em] uppercase font-mono">
            A World Worth Fighting For
          </p>
        </div>

        {/* Button panel */}
        <div
          className="flex flex-col items-center gap-3 w-72 transition-all duration-1000 delay-300"
          style={{
            opacity: logoVisible ? 1 : 0,
            transform: logoVisible ? 'translateY(0)' : 'translateY(10px)',
          }}
        >
          {/* Primary CTA */}
          <button
            onClick={handleStart}
            className="group relative w-full py-4 overflow-hidden rounded-2xl font-black text-lg tracking-widest uppercase transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #9333ea 100%)',
              boxShadow: '0 0 30px rgba(139,92,246,0.5), 0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            {/* Shimmer sweep */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
              }}
            />
            <span className="relative flex items-center justify-center gap-3 text-white">
              <Play size={20} fill="currentColor" className="group-hover:animate-pulse" />
              {status === 'authenticated' ? 'Enter World' : 'Play Now'}
            </span>
          </button>

          {/* Secondary buttons */}
          <div className="flex gap-3 w-full">
            <button
              onClick={() => setShowCredits(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm tracking-wider uppercase transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'rgba(30,10,60,0.7)',
                border: '1px solid rgba(139,92,246,0.25)',
                color: 'rgba(196, 181, 253, 0.7)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.5)';
                (e.currentTarget as HTMLElement).style.color = 'rgba(221,214,254,0.9)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.25)';
                (e.currentTarget as HTMLElement).style.color = 'rgba(196,181,253,0.7)';
              }}
            >
              <ScrollText size={15} />
              Credits
            </button>
            <button
              onClick={() => setShowOptions(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm tracking-wider uppercase transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'rgba(30,10,60,0.7)',
                border: '1px solid rgba(139,92,246,0.25)',
                color: 'rgba(196, 181, 253, 0.7)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.5)';
                (e.currentTarget as HTMLElement).style.color = 'rgba(221,214,254,0.9)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.25)';
                (e.currentTarget as HTMLElement).style.color = 'rgba(196,181,253,0.7)';
              }}
            >
              <Settings size={15} />
              Options
            </button>
          </div>

          {/* Version stamp */}
          <p className="text-violet-600/30 text-[10px] font-mono tracking-widest mt-1">
            v{process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'} · Alpha
          </p>
        </div>
      </div>

      {/* Modals */}
      {showCredits && <CreditsModal onClose={() => setShowCredits(false)} />}

      {showOptions && (
        <GameOptionsMenu
          isOpen={showOptions}
          onClose={() => setShowOptions(false)}
          isFullscreen={false}
          onToggleFullscreen={() => {}}
          isAdminUser={false}
          isCreationMode={false}
          onToggleDevEditor={() => {}}
        />
      )}
    </div>
  );
}
