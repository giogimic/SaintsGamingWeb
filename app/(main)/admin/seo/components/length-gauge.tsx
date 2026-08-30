"use client";

import { useMemo } from "react";
import { Badge } from "@/shared/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { Info, AlertCircle, CheckCircle2 } from "lucide-react";

interface LengthGaugeProps {
  label: string;
  value: string;
  minChars?: number;
  maxChars: number;
  approxMaxPixels: number;
  avgCharPixelWidth?: number; // default ~9.5px for title font, ~6.8px for body
  tooltipText: string;
}

export function LengthGauge({
  label,
  value,
  minChars = 10,
  maxChars,
  approxMaxPixels,
  avgCharPixelWidth = 8.5,
  tooltipText,
}: LengthGaugeProps) {
  const charCount = value.length;
  const approxPixelWidth = Math.round(charCount * avgCharPixelWidth);

  const status = useMemo(() => {
    if (charCount === 0) {
      return {
        label: "Empty",
        color: "bg-muted text-muted-foreground border-border",
        barColor: "bg-muted",
        icon: AlertCircle,
        message: "No content provided",
      };
    }
    if (charCount < minChars) {
      return {
        label: "Too Short",
        color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        barColor: "bg-amber-500",
        icon: AlertCircle,
        message: `Too short. Aim for at least ${minChars} characters for maximum search visibility.`,
      };
    }
    if (charCount > maxChars || approxPixelWidth > approxMaxPixels) {
      return {
        label: "Likely Truncated",
        color: "bg-rose-500/10 text-rose-400 border-rose-500/30",
        barColor: "bg-rose-500",
        icon: AlertCircle,
        message: `Exceeds approximate Google limits (~${approxMaxPixels}px / ${maxChars} chars). Search engines will truncate with "..."`,
      };
    }
    return {
      label: "Optimal",
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      barColor: "bg-emerald-500",
      icon: CheckCircle2,
      message: "Length is well-balanced for search engine result pages.",
    };
  }, [charCount, minChars, maxChars, approxPixelWidth, approxMaxPixels]);

  const percentage = Math.min(100, Math.round((charCount / maxChars) * 100));
  const StatusIcon = status.icon;

  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span>{label} Length</span>
          <Tooltip>
            <TooltipTrigger className="text-muted-foreground/60 hover:text-foreground inline-flex items-center">
              <Info className="h-3.5 w-3.5" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              <p>{tooltipText}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                * Note: Google truncates dynamically based on per-character pixel width and device viewport.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-muted-foreground">
            <strong className="text-foreground font-semibold">{charCount}</strong>/{maxChars} chars
            <span className="text-muted-foreground/60 ml-1">(~{approxPixelWidth}px / {approxMaxPixels}px)</span>
          </span>
          <Badge variant="outline" className={`px-1.5 py-0 text-[10px] font-medium ${status.color}`}>
            <StatusIcon className="h-3 w-3 mr-1 inline" />
            {status.label}
          </Badge>
        </div>
      </div>

      <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${status.barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
