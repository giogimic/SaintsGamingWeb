export function useTheme() {
  return {
    theme: 'dark',
    setTheme: () => {},
    resolvedTheme: 'dark',
    themes: ['light', 'dark', 'system'],
    systemTheme: 'dark'
  };
}

export function ThemeProvider({ children }: { children: any }) {
  return children;
}
