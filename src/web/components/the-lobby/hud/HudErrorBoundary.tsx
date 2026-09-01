'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * HudErrorBoundary
 *
 * Catches errors in overlay/HUD panels so a localized UI glitch never
 * unmounts or crashes the underlying Babylon.js game canvas or multiplayer connection.
 */
export class HudErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('HUD error caught by HudErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="pointer-events-auto bg-[#050b14]/90 border border-destructive/40 rounded-xl p-3 backdrop-blur-md font-mono text-xs text-slate-200 max-w-sm m-2 shadow-xl">
          <div className="flex items-center gap-2 text-destructive mb-1 font-bold">
            <AlertCircle className="w-4 h-4" />
            <span>{this.props.fallbackTitle || 'UI Module Error'}</span>
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">
            {this.state.error?.message || 'A temporary interface error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded bg-primary/20 hover:bg-primary/30 text-primary transition-colors border border-primary/30 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Retry UI
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
