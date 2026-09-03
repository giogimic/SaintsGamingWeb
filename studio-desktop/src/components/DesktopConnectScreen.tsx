import React, { useState } from 'react';
import { Gamepad2, ExternalLink, Key, Globe, ArrowRight, Loader2, AlertCircle, CheckCircle2, Settings, RotateCcw } from 'lucide-react';
import { useDesktopAuth } from '../providers/DesktopAuthProvider';
import { MidnightTropicalBackground } from '@/web/components/the-lobby/MidnightTropicalBackground';

export const DesktopConnectScreen: React.FC = () => {
  const { serverUrl, setServerUrl, connectBrowser, setManualToken, isLoading } = useDesktopAuth();
  const [customUrl, setCustomUrl] = useState(serverUrl);
  const [showSettings, setShowSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setError(null);
    setServerUrl(customUrl);
    await connectBrowser();
  };

  const handleSaveSettings = () => {
    setServerUrl(customUrl);
    setShowSettings(false);
  };

  const handleResetDefaultUrl = () => {
    const defaultUrl = 'https://saintsgaming.net';
    setCustomUrl(defaultUrl);
    setServerUrl(defaultUrl);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setManualLoading(true);
    setError(null);
    try {
      setServerUrl(customUrl);
      const success = await setManualToken(tokenInput.trim());
      if (!success) {
        setError('Invalid or expired token. Please verify your account and try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error');
    } finally {
      setManualLoading(false);
    }
  };

  const displayServerHost = () => {
    try {
      const url = new URL(serverUrl);
      return url.host;
    } catch {
      return serverUrl.replace(/^https?:\/\//, '');
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden select-none">
      {/* ── Dynamic Website Tropical Midnight Atmosphere ── */}
      <MidnightTropicalBackground showPalms={true} showWater={true} className="z-0" />

      {/* ── Central Glass Card ── */}
      <div className="w-full max-w-md bg-[#0b101b]/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10 space-y-6">
        {/* Header Badge */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 text-primary shadow-lg shadow-primary/20">
            <Gamepad2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Saints <span className="sg-text-gradient font-extrabold">Gaming</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Time To Play
            </p>
          </div>
        </div>

        {/* Feature Highlights (Matches site authorization panel) */}
        <div className="p-3.5 rounded-xl bg-card/40 border border-border/40 space-y-2 text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <span>Access the World Studio — build 3D voxel worlds</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <span>Stay connected with community news and forums</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <span>Publish and share your creations with the community</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-xs text-destructive flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Primary Action Button */}
        <div className="space-y-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={handleConnect}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-bold text-sm transition flex items-center justify-center gap-2.5 shadow-lg shadow-sky-500/25 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Session...</span>
              </>
            ) : (
              <>
                <span>Sign In via Browser</span>
                <ExternalLink className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Secondary Action Options */}
          <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1.5 hover:text-slate-200 transition py-1 cursor-pointer"
            >
              <Globe className="w-3 h-3 text-sky-400" />
              <span>Server: <strong className="text-slate-300 font-mono">{displayServerHost()}</strong></span>
            </button>

            <button
              type="button"
              onClick={() => setShowManual(!showManual)}
              className="hover:text-slate-200 transition py-1 cursor-pointer flex items-center gap-1"
            >
              <Key className="w-3 h-3 text-primary" />
              <span>{showManual ? 'Hide token' : 'Manual token'}</span>
            </button>
          </div>
        </div>

        {/* Server Settings Drawer / Accordion */}
        {showSettings && (
          <div className="pt-3 border-t border-border/40 space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-sky-400" />
                <span>Target Server URL</span>
              </label>
              <button
                type="button"
                onClick={handleResetDefaultUrl}
                className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                title="Reset to saintsgaming.net"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Default</span>
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://saintsgaming.net"
                className="flex-1 px-3 py-2 bg-[#050b14]/90 border border-border/50 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-sky-400/60 transition"
              />
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-3 py-2 rounded-xl bg-card/60 hover:bg-card border border-border/50 text-xs text-white font-medium transition cursor-pointer"
              >
                Apply
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Defaults to Saints Gaming production (<span className="text-slate-400">saintsgaming.net</span>). For local testing, use <span className="font-mono text-slate-400">http://localhost:3000</span>.
            </p>
          </div>
        )}

        {/* Manual Token Input Accordion */}
        {showManual && (
          <form onSubmit={handleManualSubmit} className="pt-3 border-t border-border/40 space-y-3 animate-fadeIn">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-primary" />
                <span>Studio Session Token</span>
              </label>
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="sg_studio_..."
                className="w-full px-3 py-2 bg-[#050b14]/90 border border-border/50 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-primary/60 transition"
              />
            </div>
            <button
              type="submit"
              disabled={manualLoading || !tokenInput.trim()}
              className="w-full py-2 px-3 rounded-xl bg-card/60 hover:bg-card border border-border/50 text-xs font-medium text-white transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {manualLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>Authenticate Token</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
