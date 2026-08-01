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
    <div 
      className="absolute inset-0 z-[110] flex items-center justify-center animate-in fade-in duration-300"
      style={{ backgroundColor: 'rgba(240, 248, 255, 0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div className="relative w-full max-w-sm bg-white border-4 border-slate-200 rounded-[2rem] shadow-2xl p-8">
        
        {/* Close / Back button */}
        <button 
          onClick={() => setGameMode('TITLE_SCREEN')}
          className="absolute -top-4 -right-4 w-10 h-10 flex items-center justify-center bg-slate-100 border-4 border-slate-200 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-all shadow-md active:scale-95"
        >
          <X size={20} strokeWidth={3} />
        </button>

        <button 
          onClick={() => setGameMode('TITLE_SCREEN')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-600 mb-6 text-sm font-bold transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={3} /> Back to Title
        </button>

        <h2 className="text-3xl font-extrabold text-center text-slate-800 tracking-tight mb-8">
          Sign In
        </h2>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-600 p-3 rounded-2xl text-sm font-bold mb-6 text-center shadow-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2 px-1">Email or Username</label>
            <input 
              type="text" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-bold outline-none focus:border-blue-400 focus:bg-white transition-all shadow-inner placeholder:text-slate-300 placeholder:font-medium"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2 px-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-bold outline-none focus:border-blue-400 focus:bg-white transition-all shadow-inner placeholder:text-slate-300 placeholder:font-medium"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="mt-4 w-full h-14 bg-blue-500 hover:bg-blue-400 active:scale-95 text-white font-extrabold text-lg rounded-2xl shadow-[0_4px_0_0_#2563eb] hover:shadow-[0_2px_0_0_#2563eb] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 uppercase tracking-wide"
          >
            {loading ? 'Authenticating...' : (
              <>
                <LogIn size={20} strokeWidth={3} />
                Let's Go!
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm font-bold text-slate-400">
          Don't have an account? <br/>
          <a href="/register" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 transition-colors mt-2 inline-block">
            Create one on the Website
          </a>
        </div>
      </div>
    </div>
  );
}
