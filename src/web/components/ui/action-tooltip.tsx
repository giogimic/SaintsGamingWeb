import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/web/components/ui/tooltip";

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
    <TooltipProvider delay={delayDuration}>
      <Tooltip>
        <TooltipTrigger>{children}</TooltipTrigger>
        <TooltipContent side={side} align={align} className={className}>
          <p className="font-semibold text-sm capitalize">{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
