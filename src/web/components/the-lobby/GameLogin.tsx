'use client';

import { useState } from 'react';
import { useGameStore } from './store';
import { signIn } from 'next-auth/react';
import { X, LogIn, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function GameLogin() {
  const setGameMode = useGameStore((state) => state.setGameMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      className="pointer-events-auto absolute inset-0 z-[110] flex items-center justify-center animate-in fade-in duration-300"
      style={{ background: 'rgba(5,0,15,0.92)', backdropFilter: 'blur(12px)' }}
    >
      {/* Subtle glow behind the card */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      <div
        className="relative w-full max-w-sm mx-4 animate-in fade-in zoom-in-95 duration-300 rounded-2xl border border-violet-500/25 overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, rgba(20,8,48,0.98) 0%, rgba(12,4,30,0.98) 100%)',
          boxShadow: '0 0 60px rgba(139,92,246,0.2), 0 25px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)',
        }}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />

        <div className="p-8">
          {/* Header row */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setGameMode('TITLE_SCREEN')}
              className="flex items-center gap-1.5 text-violet-400/50 hover:text-violet-300 text-xs font-bold tracking-wider uppercase transition-colors"
            >
              <ArrowLeft size={14} strokeWidth={3} />
              Back
            </button>
            <button
              onClick={() => setGameMode('TITLE_SCREEN')}
              className="p-1.5 rounded-lg text-violet-500/40 hover:text-violet-300 hover:bg-violet-900/30 transition-all"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* Logo mark */}
          <div className="text-center mb-8">
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
            <p className="text-violet-500/50 text-[10px] tracking-[0.5em] uppercase font-mono mt-1">
              Sign In to Continue
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-6 px-4 py-3 rounded-xl border border-red-500/30 text-red-300 text-sm font-bold text-center animate-in fade-in duration-200"
              style={{ background: 'rgba(239,68,68,0.1)' }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Email */}
            <div>
              <label className="block text-[10px] font-black text-violet-400/50 uppercase tracking-[0.2em] mb-2 px-1">
                Email / Username
              </label>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl font-bold text-sm outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(139,92,246,0.2)',
                  color: '#e9d5ff',
                  caretColor: '#a855f7',
                }}
                onFocus={e => {
                  e.currentTarget.style.border = '1px solid rgba(139,92,246,0.6)';
                  e.currentTarget.style.background = 'rgba(139,92,246,0.08)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.1)';
                }}
                onBlur={e => {
                  e.currentTarget.style.border = '1px solid rgba(139,92,246,0.2)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                placeholder="Enter your email"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-black text-violet-400/50 uppercase tracking-[0.2em] mb-2 px-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-xl font-bold text-sm outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(139,92,246,0.2)',
                    color: '#e9d5ff',
                    caretColor: '#a855f7',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.border = '1px solid rgba(139,92,246,0.6)';
                    e.currentTarget.style.background = 'rgba(139,92,246,0.08)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.1)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.border = '1px solid rgba(139,92,246,0.2)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-500/40 hover:text-violet-300 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3.5 rounded-xl font-black text-base tracking-widest uppercase transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              style={{
                background: loading
                  ? 'rgba(139,92,246,0.4)'
                  : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #9333ea 100%)',
                boxShadow: loading ? 'none' : '0 0 25px rgba(139,92,246,0.4), 0 4px 15px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                color: 'white',
              }}
            >
              {loading ? (
                <span className="font-mono text-sm animate-pulse">Authenticating...</span>
              ) : (
                <>
                  <LogIn size={18} strokeWidth={2.5} />
                  Enter World
                </>
              )}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-8 pt-6 border-t border-violet-900/30 text-center space-y-2">
            <p className="text-violet-500/40 text-xs font-mono">
              No account?{' '}
              <a
                href="/register"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 transition-colors font-bold"
              >
                Register on the website
              </a>
            </p>
            <p>
              <a
                href="/forgot-password"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-500/30 hover:text-violet-400/50 text-[11px] font-mono transition-colors"
              >
                Forgot password?
              </a>
            </p>
          </div>
        </div>

        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-violet-900/50 to-transparent" />
      </div>
    </div>
  );
}
