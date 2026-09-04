'use client';

import React from 'react';
import { UploadProgressState } from '@/web/lib/upload-client';
import { 
  FileVideo, 
  ImageIcon, 
  FileArchive, 
  File, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  Zap,
  Clock,
  HardDrive
} from 'lucide-react';
import { Button } from '@/web/components/ui/button';

interface UploadProgressBarProps {
  uploadState: UploadProgressState | null;
  onCancel?: () => void;
  className?: string;
}

export const UploadProgressBar: React.FC<UploadProgressBarProps> = ({
  uploadState,
  onCancel,
  className = '',
}) => {
  if (!uploadState) return null;

  const {
    progress,
    formattedSpeed,
    formattedEta,
    formattedLoaded,
    formattedTotal,
    fileName,
    fileType,
    stage,
    error,
  } = uploadState;

  const renderIcon = () => {
    switch (fileType) {
      case 'video':
        return <FileVideo className="w-5 h-5 text-sky-400 shrink-0" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-purple-400 shrink-0" />;
      case 'archive':
        return <FileArchive className="w-5 h-5 text-amber-400 shrink-0" />;
      default:
        return <File className="w-5 h-5 text-emerald-400 shrink-0" />;
    }
  };

  const isError = stage === 'error' || stage === 'aborted';
  const isComplete = stage === 'completed';
  const isProcessing = stage === 'processing';

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-r from-card/90 via-card/95 to-card/90 backdrop-blur-md p-4 shadow-xl text-card-foreground animate-in fade-in slide-in-from-top-2 duration-200 ${
        isError
          ? 'border-destructive/50 bg-destructive/5'
          : isComplete
          ? 'border-emerald-500/50 bg-emerald-950/10'
          : 'border-primary/40'
      } ${className}`}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="p-2 rounded-xl bg-black/40 border border-white/10 shadow-inner">
            {renderIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground truncate max-w-[240px] sm:max-w-xs md:max-w-md">
                {fileName}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0 uppercase">
                {fileType}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1 font-mono">
                <HardDrive className="w-3 h-3 text-muted-foreground" />
                {formattedLoaded} / {formattedTotal}
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span className="font-mono font-bold text-primary">
                {progress}%
              </span>
            </div>
          </div>
        </div>

        {/* Action / Status Pill */}
        <div className="flex items-center gap-2 shrink-0">
          {stage === 'uploading' && onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg flex items-center gap-1"
              title="Cancel Upload"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cancel</span>
            </Button>
          )}

          {isProcessing && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-medium animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Processing Media...</span>
            </div>
          )}

          {isComplete && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Attached</span>
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20 text-xs font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{stage === 'aborted' ? 'Cancelled' : 'Failed'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Glowing Neon Progress Bar */}
      <div className="relative w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/10 p-0.5">
        <div
          className={`h-full rounded-full transition-all duration-200 relative overflow-hidden ${
            isError
              ? 'bg-destructive'
              : isComplete
              ? 'bg-emerald-400'
              : 'bg-gradient-to-r from-primary via-cyan-400 to-primary animate-pulse'
          }`}
          style={{ width: `${Math.max(2, progress)}%` }}
        >
          {stage === 'uploading' && (
            <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:16px_16px] animate-[move-bg_1s_linear_infinite]" />
          )}
        </div>
      </div>

      {/* Bottom Live Stats Row */}
      {!isError && !isComplete && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2 font-mono">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>Speed: <strong className="text-foreground">{formattedSpeed}</strong></span>
          </div>

          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>ETA: <strong className="text-foreground">{formattedEta}</strong></span>
          </div>
        </div>
      )}

      {/* Error display */}
      {isError && error && (
        <div className="mt-2 text-[11px] text-destructive flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
