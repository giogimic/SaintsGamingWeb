import React, { useState } from 'react';
import { Sparkles, ExternalLink, Key, Globe, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useDesktopAuth } from '../providers/DesktopAuthProvider';

export const DesktopConnectScreen: React.FC = () => {
  const { serverUrl, setServerUrl, connectBrowser, setManualToken, isLoading } = useDesktopAuth();
  const [customUrl, setCustomUrl] = useState(serverUrl);
  const [showManual, setShowManual] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setError(null);
    setServerUrl(customUrl);
    await connectBrowser();
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

  return (
    <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden bg-[#050b14]">
      {/* Background ambient lighting */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 text-primary shadow-inner">
            <Sparkles className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Saints <span className="sg-text-gradient">World Studio</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Standalone 3D Volumetric CAD Authoring Suite
          </p>
        </div>

        {/* Server Target Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span>Target Server URL</span>
          </label>
          <input
            type="text"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="http://localhost:3000 or https://saintsgaming.com"
            className="w-full px-3 py-2 bg-[#050b14]/80 border border-border/50 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-primary/60 transition"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-xs text-destructive flex items-start gap-2">
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
            className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition flex items-center justify-center gap-2.5 shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50"
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

          <button
            type="button"
            onClick={() => setShowManual(!showManual)}
            className="w-full text-center text-xs text-muted-foreground hover:text-slate-300 transition py-1 cursor-pointer"
          >
            {showManual ? 'Hide manual token input' : 'Paste authorization token manually'}
          </button>
        </div>

        {/* Manual Token Input Accordion */}
        {showManual && (
          <form onSubmit={handleManualSubmit} className="pt-2 border-t border-border/30 space-y-3 animate-fadeIn">
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
                className="w-full px-3 py-2 bg-[#050b14]/80 border border-border/50 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-primary/60 transition"
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
