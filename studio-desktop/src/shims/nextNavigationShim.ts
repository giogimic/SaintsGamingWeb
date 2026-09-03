import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Hash-based router shim for standalone desktop export (Electron / Vite).
 * Eliminates 404 and white-screen errors under file:// protocol.
 */
export function useRouter() {
  const push = useCallback((url: string) => {
    if (!url) return;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.openExternal) {
        (window as any).electronAPI.openExternal(url);
      } else if (typeof window !== 'undefined') {
        window.open(url, '_blank');
      }
      return;
    }
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    if (typeof window !== 'undefined') {
      window.location.hash = cleanUrl;
    }
  }, []);

  const replace = useCallback((url: string) => {
    push(url);
  }, [push]);

  return useMemo(() => ({
    push,
    replace,
    prefetch: () => {},
    back: () => {
      if (typeof window !== 'undefined') window.history.back();
    },
    forward: () => {
      if (typeof window !== 'undefined') window.history.forward();
    },
    refresh: () => {
      if (typeof window !== 'undefined') window.location.reload();
    },
  }), [push, replace]);
}

export function usePathname(): string {
  const [pathname, setPathname] = useState<string>(() => {
    if (typeof window === 'undefined') return '/';
    const hash = window.location.hash;
    return hash ? hash.replace(/^#/, '').split('?')[0] : '/';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleHashChange = () => {
      const hash = window.location.hash;
      setPathname(hash ? hash.replace(/^#/, '').split('?')[0] : '/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return pathname;
}

export function useSearchParams(): URLSearchParams {
  const [params, setParams] = useState<URLSearchParams>(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    const hash = window.location.hash;
    const qIndex = hash.indexOf('?');
    if (qIndex !== -1) {
      return new URLSearchParams(hash.substring(qIndex));
    }
    return new URLSearchParams(window.location.search);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleHashChange = () => {
      const hash = window.location.hash;
      const qIndex = hash.indexOf('?');
      if (qIndex !== -1) {
        setParams(new URLSearchParams(hash.substring(qIndex)));
      } else {
        setParams(new URLSearchParams(window.location.search));
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return params;
}

export function useParams(): Record<string, string> {
  return {};
}

export default { useRouter, usePathname, useSearchParams, useParams };
