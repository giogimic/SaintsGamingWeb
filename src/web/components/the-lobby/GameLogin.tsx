'use client';

import { useState } from 'react';
import { useGameStore } from './store';
import { signIn } from 'serapht-auth/react';
import { X, LogIn, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';
import { useTheme } from 'serapht-themes';
import { MidnightTropicalBackground } from './MidnightTropicalBackground';

export default function GameLogin() {
  const setGameMode = useGameStore((state) => state.setGameMode);
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isVice = theme === 'vice';
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
        identifier: email,
        password,
      });

      if (res?.error) {
        setError('Invalid credentials. Check your email/username and password.');
      } else {
        soundSynth?.playLevelUpSound?.();
        // No auto-redirect here, if setup is missing TheLobby will render GameOfflineScreen
        setGameMode('TITLE_SCREEN');
      }
    } catch {
      setError('An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center animate-in fade-in duration-300 select-none font-sans pt-14 pb-12"
      style={{ backgroundColor: isLight ? '#240046' : isVice ? '#1b121c' : '#050014' }}
    >
      {/* Dynamic Horizon Background */}
      <MidnightTropicalBackground />

      <div
        className="relative w-full max-w-sm mx-4 animate-in fade-in zoom-in-95 duration-300 rounded-2xl border border-[#00f5d4]/40 overflow-hidden bg-[#050014]/90 backdrop-blur-xl shadow-[0_0_60px_rgba(0,245,212,0.25)] z-10"
        style={{
          clipPath: 'polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px)',
        }}
      >
        <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-[#00f5d4] to-transparent" />

        <div className="p-8">
          {/* Header row */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => {
                soundSynth?.playSelectSound?.();
                setGameMode('TITLE_SCREEN');
              }}
              className="flex items-center gap-1.5 text-pink-300 hover:text-white text-xs font-mono font-bold tracking-wider uppercase transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} strokeWidth={3} />
              Back
            </button>
            <button
              onClick={() => {
                soundSynth?.playSelectSound?.();
                setGameMode('TITLE_SCREEN');
              }}
              className="p-1.5 rounded-lg text-pink-400 hover:text-white hover:bg-pink-900/30 transition-all cursor-pointer"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* Logo mark */}
          <div className="text-center mb-6">
            <h1
              className="text-4xl font-black tracking-widest font-mono"
              style={{
                background: 'linear-gradient(180deg, #ffffff 0%, #ffbe0b 50%, #f20089 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 20px rgba(242,0,137,0.5))',
              }}
            >
              SAINTS
            </h1>
            <p className="text-cyan-300/80 text-[10px] tracking-[0.4em] uppercase font-mono mt-1 font-bold">
              PLAYER AUTHENTICATION
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 px-3.5 py-2.5 rounded-xl border border-rose-500/40 text-rose-300 text-xs font-mono font-bold text-center bg-rose-950/40 animate-in fade-in duration-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-mono">
            {/* Email / Username */}
            <div>
              <label className="block text-[10px] font-bold text-pink-300/80 uppercase tracking-widest mb-1.5 px-1">
                Email / Call-Sign
              </label>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl font-bold text-xs bg-black/60 border border-pink-500/30 text-white placeholder:text-pink-400/40 outline-none focus:border-[#00f5d4] transition-all"
                placeholder="Enter your identifier"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-bold text-pink-300/80 uppercase tracking-widest mb-1.5 px-1">
                Security Key
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl font-bold text-xs bg-black/60 border border-pink-500/30 text-white placeholder:text-pink-400/40 outline-none focus:border-[#00f5d4] transition-all"
                  placeholder="••••••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3 rounded-xl font-black text-xs tracking-wider uppercase transition-all bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 text-white shadow-[0_0_20px_rgba(242,0,137,0.4)] disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              {loading ? (
                <span className="animate-pulse">Authenticating...</span>
              ) : (
                <>
                  <LogIn size={15} />
                  Authorize & Enter Realm
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
