'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Sparkles, CheckCircle2, AlertTriangle, ExternalLink, Copy, Check, ArrowRight } from 'lucide-react';

interface StudioAuthorizeClientProps {
  user: {
    id: string;
    username: string;
    displayName: string | null;
    permissionLevel: number;
    image: string | null;
    email: string;
  };
  hasAccess: boolean;
}

export function StudioAuthorizeClient({ user, hasAccess }: StudioAuthorizeClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthorize = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/studio-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to issue studio token');
      }

      const data = await res.json();
      const rawToken = data.token;
      setToken(rawToken);

      // Trigger custom protocol redirect to the desktop app
      const protocolUrl = `saints-studio://auth?token=${encodeURIComponent(rawToken)}&user=${encodeURIComponent(user.username)}`;
      window.location.href = protocolUrl;
    } catch (err: any) {
      setError(err?.message || 'Authorization failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-md bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 text-primary mb-3 shadow-inner">
          <Sparkles className="w-7 h-7 animate-pulse" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight sg-text-gradient">
          Saints World Studio
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Desktop Application Connection
        </p>
      </div>

      {/* Account Info Card */}
      <div className="bg-[#050b14]/70 border border-border/40 rounded-xl p-4 mb-5 flex items-center gap-3">
        {user.image ? (
          <img
            src={user.image}
            alt={user.username}
            className="w-11 h-11 rounded-full border border-primary/30 object-cover"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-primary text-sm">
            {user.username.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate text-white">
              {user.displayName || user.username}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
              Lv {user.permissionLevel}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
      </div>

      {/* Access Verification */}
      {!hasAccess ? (
        <div className="bg-destructive/15 border border-destructive/30 rounded-xl p-4 mb-5 text-xs text-destructive flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Studio Access Restricted</span>
            Your account requires Admin or Developer privileges to access the World Studio authoring suite. Contact a server administrator.
          </div>
        </div>
      ) : (
        <div className="space-y-3 mb-6 text-xs text-muted-foreground leading-relaxed">
          <p>
            Authorizing connects your desktop app to the live Saints Gaming server. This allows you to:
          </p>
          <ul className="space-y-1.5 pl-1">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Directly edit, load, and save 3D voxel maps</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Import & export blueprints and custom prefabs</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Publish world changes to the live multiplayer realm</span>
            </li>
          </ul>
        </div>
      )}

      {error && (
        <div className="bg-destructive/15 border border-destructive/30 rounded-lg p-3 mb-4 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Actions */}
      {!token ? (
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            disabled={!hasAccess || loading}
            onClick={handleAuthorize}
            className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-primary/20"
          >
            {loading ? (
              <span>Authorizing Studio...</span>
            ) : (
              <>
                <span>Authorize & Launch Studio</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full py-2 px-4 rounded-xl border border-border/50 hover:bg-card/40 text-muted-foreground hover:text-white text-xs transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-3.5 text-xs text-emerald-400 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Authorization Successful!</span>
              The browser is launching Saints World Studio. If the app does not open automatically, click below or paste the token manually.
            </div>
          </div>

          <div className="space-y-2">
            <a
              href={`saints-studio://auth?token=${encodeURIComponent(token)}&user=${encodeURIComponent(user.username)}`}
              className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm transition flex items-center justify-center gap-2 text-center"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Click to Open Studio App</span>
            </a>

            <div className="flex items-center gap-2">
              <input
                type="password"
                readOnly
                value={token}
                className="flex-1 px-3 py-1.5 bg-[#050b14] border border-border/50 rounded-lg text-[11px] font-mono text-muted-foreground truncate focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyToken}
                className="px-3 py-1.5 rounded-lg border border-border/50 bg-card/40 hover:bg-card text-xs flex items-center gap-1.5 transition text-slate-300 hover:text-white cursor-pointer"
                title="Copy Token"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
