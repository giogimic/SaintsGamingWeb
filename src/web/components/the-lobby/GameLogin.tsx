'use client';

import { useState } from 'react';
import { useGameStore } from './store';
import { signIn } from 'next-auth/react';
import { X, LogIn, ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

export default function GameLogin() {
  const setGameMode = useGameStore((state) => state.setGameMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    soundSynth?.playActionSound?.();
    setLoading(true);
    setError('');

    try {
      const res = await signIn('credentials', {
        redirect: false,
        // Auth credentials provider validates `identifier` (email or username).
        identifier: email,
        password,
      });

      if (res?.error) {
        setError('Invalid credentials. Check your email and password.');
      } else {
        soundSynth?.playLevelUpSound?.();
        setGameMode('SERVER_SELECT');
      }
    } catch {
      setError('An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-[110] flex items-center justify-center animate-in fade-in duration-300 select-none font-mono"
      style={{ background: 'rgba(5,0,15,0.94)', backdropFilter: 'blur(16px)' }}
    >
      {/* Glow highlight */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      <div
        className="relative w-full max-w-sm mx-4 animate-in fade-in zoom-in-95 duration-300 rounded-2xl border border-violet-500/30 overflow-hidden bg-black/90 shadow-[0_0_60px_rgba(139,92,246,0.25)]"
        style={{
          clipPath: 'polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px)',
        }}
      >
        <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />

        <div className="p-8">
          {/* Header row */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => {
                soundSynth?.playSelectSound?.();
                setGameMode('TITLE_SCREEN');
              }}
              className="flex items-center gap-1.5 text-violet-400/60 hover:text-violet-300 text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} strokeWidth={3} />
              Back
            </button>
            <button
              onClick={() => {
                soundSynth?.playSelectSound?.();
                setGameMode('TITLE_SCREEN');
              }}
              className="p-1.5 rounded-lg text-violet-500/40 hover:text-violet-300 hover:bg-violet-900/30 transition-all cursor-pointer"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* Logo mark */}
          <div className="text-center mb-6">
            <h1
              className="text-4xl font-black tracking-widest"
              style={{
                fontFamily: 'serif',
                background: 'linear-gradient(180deg, #e8d5ff 0%, #a855f7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 20px rgba(139,92,246,0.5))',
              }}
            >
              SAINTS
            </h1>
            <p className="text-violet-400/60 text-[10px] tracking-[0.5em] uppercase font-mono mt-1 font-bold">
              OPERATIVE AUTHENTICATION
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-5 px-3.5 py-2.5 rounded-xl border border-rose-500/40 text-rose-300 text-xs font-bold text-center bg-rose-950/40 animate-in fade-in duration-200"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div>
              <label className="block text-[10px] font-bold text-violet-400/70 uppercase tracking-widest mb-1.5 px-1">
                Email / Operative Call-Sign
              </label>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl font-bold text-sm bg-black/60 border border-violet-500/30 text-violet-100 placeholder:text-violet-500/40 outline-none focus:border-violet-400 transition-all"
                placeholder="Enter your identifier"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-bold text-violet-400/70 uppercase tracking-widest mb-1.5 px-1">
                Security Key
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl font-bold text-sm bg-black/60 border border-violet-500/30 text-violet-100 placeholder:text-violet-500/40 outline-none focus:border-violet-400 transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => {
                    soundSynth?.playUiClick?.();
                    setShowPassword(s => !s);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-violet-400/50 hover:text-violet-200 transition-colors p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3 rounded-xl font-black text-sm tracking-widest uppercase transition-all bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-[0_0_25px_rgba(139,92,246,0.4)] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              {loading ? (
                <span className="font-mono text-xs animate-pulse">Authenticating...</span>
              ) : (
                <>
                  <LogIn size={16} strokeWidth={2.5} />
                  Enter World
                </>
              )}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-6 pt-5 border-t border-violet-900/40 text-center space-y-1.5">
            <p className="text-violet-400/50 text-xs font-mono">
              New Operative?{' '}
              <a
                href="/register"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-300 hover:text-violet-100 transition-colors font-bold underline"
              >
                Register
              </a>
            </p>
            <p>
              <a
                href="/forgot-password"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-500/40 hover:text-violet-300 text-[11px] font-mono transition-colors"
              >
                Forgot credentials?
              </a>
            </p>
          </div>
        </div>

        <div className="absolute bottom-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-violet-900/50 to-transparent" />
      </div>
    </div>
  );
}

