'use client';

import { useState } from 'react';
import { useGameStore } from './store';
import { signIn } from 'next-auth/react';
import { X, LogIn, ArrowLeft } from 'lucide-react';

export default function GameLogin() {
  const setGameMode = useGameStore((state) => state.setGameMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError('Invalid email or password');
      } else {
        // Successfully logged in! We should now go to SERVER_SELECT
        setGameMode('SERVER_SELECT');
      }
    } catch (err) {
      setError('An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-sm sg-glass border border-white/10 rounded-xl shadow-[0_0_30px_rgba(139,92,246,0.3)] p-6">
        
        {/* Close / Back button */}
        <button 
          onClick={() => setGameMode('TITLE_SCREEN')}
          className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center bg-red-900 border-2 border-red-500 rounded-full text-red-200 hover:bg-red-800 transition-colors shadow-lg"
        >
          <X size={16} />
        </button>

        <button 
          onClick={() => setGameMode('TITLE_SCREEN')}
          className="flex items-center gap-2 text-violet-300 hover:text-white mb-6 text-sm transition-colors"
        >
          <ArrowLeft size={16} /> Back to Title
        </button>

        <h2 className="text-2xl font-bold text-center sg-text-gradient mb-6 font-serif">
          Authentication
        </h2>

        {error && (
          <div className="bg-red-900/50 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-violet-300 uppercase tracking-wider mb-1">Email or Username</label>
            <input 
              type="text" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-violet-500 transition-colors focus:shadow-[0_0_15px_rgba(139,92,246,0.2)]"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-violet-300 uppercase tracking-wider mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-violet-500 transition-colors focus:shadow-[0_0_15px_rgba(139,92,246,0.2)]"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="mt-4 w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-white font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(139,92,246,0.4)] flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400">
          Don&apos;t have an account? <br/>
          <a href="/register" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-fuchsia-400 hover:underline transition-colors mt-1 inline-block">
            Register on the Website
          </a>
        </div>
      </div>
    </div>
  );
}
