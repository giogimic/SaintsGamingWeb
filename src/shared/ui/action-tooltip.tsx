import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/ui/tooltip";

interface ActionTooltipProps {
  label: string | React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  className?: string;
  asChild?: boolean;
}

export function ActionTooltip({
  label,
  children,
  side = "top",
  align = "center",
  delayDuration = 200,
  className,
  asChild = true,
}: ActionTooltipProps) {
  if (!label) return <>{children}</>;

  return (
    <Tooltip delay={delayDuration}>
      <TooltipTrigger asChild={asChild}>{children}</TooltipTrigger>
      <TooltipContent side={side} align={align} className={className}>
        <p className="font-semibold text-sm capitalize">{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
