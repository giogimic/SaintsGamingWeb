"use client";

import * as React from "react";
import { ThemeProvider as SeraphtThemesProvider } from "serapht-themes";
import { type ThemeProviderProps } from "serapht-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <SeraphtThemesProvider {...props}>{children}</SeraphtThemesProvider>;
}
