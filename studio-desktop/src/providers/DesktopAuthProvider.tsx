import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { StudioApiClient } from '@/shared/api/StudioApiClient';

export interface StudioUser {
  id: string;
  username: string;
  displayName: string | null;
  permissionLevel: number;
  image: string | null;
  email: string;
}

interface DesktopAuthContextType {
  user: StudioUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  serverUrl: string;
  setServerUrl: (url: string) => void;
  connectBrowser: () => Promise<void>;
  logout: () => void;
  setManualToken: (token: string) => Promise<boolean>;
}

const DesktopAuthContext = createContext<DesktopAuthContextType | null>(null);

const DEFAULT_SERVER_URL = (import.meta as any).env?.VITE_SERVER_URL || 'http://localhost:3000';

export const DesktopAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [serverUrl, setServerUrlState] = useState<string>(() => {
    return localStorage.getItem('saints_studio_server_url') || DEFAULT_SERVER_URL;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('saints_studio_token') || null;
  });
  const [user, setUser] = useState<StudioUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setServerUrl = useCallback((url: string) => {
    const cleanUrl = url.replace(/\/+$/, '');
    setServerUrlState(cleanUrl);
    localStorage.setItem('saints_studio_server_url', cleanUrl);
    StudioApiClient.getInstance().setBaseUrl(cleanUrl);
  }, []);

  const verifyToken = useCallback(async (tokenToVerify: string) => {
    setIsLoading(true);
    StudioApiClient.getInstance().setBaseUrl(serverUrl);
    StudioApiClient.getInstance().setTokenGetter(() => tokenToVerify);

    const res = await StudioApiClient.getInstance().verifyAuth();
    if (res.valid && res.user) {
      setUser(res.user);
      setToken(tokenToVerify);
      localStorage.setItem('saints_studio_token', tokenToVerify);
      setIsLoading(false);
      return true;
    } else {
      setUser(null);
      setToken(null);
      localStorage.removeItem('saints_studio_token');
      setIsLoading(false);
      return false;
    }
  }, [serverUrl]);

  // Handle deep-link auth callback
  const handleAuthUrl = useCallback(async (urlStr: string) => {
    try {
      if (!urlStr.startsWith('saints-studio://')) return;
      const parsed = new URL(urlStr);
      const incomingToken = parsed.searchParams.get('token');
      if (incomingToken) {
        await verifyToken(incomingToken);
      }
    } catch (e) {
      console.error('Failed to parse deep link URL:', e);
    }
  }, [verifyToken]);

  useEffect(() => {
    StudioApiClient.getInstance().setBaseUrl(serverUrl);
    StudioApiClient.getInstance().setTokenGetter(() => token);

    if (token) {
      verifyToken(token);
    } else {
      setIsLoading(false);
    }

    // Listen for Tauri deep link events if in Tauri runtime
    let unlisten: (() => void) | undefined;
    const setupTauriListener = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlisten = await listen<string>('saints-studio-deep-link', (event) => {
          handleAuthUrl(event.payload);
        });
      } catch {
        // Fallback for Electron runtime
        if ((window as any).electronAPI?.onDeepLink) {
          (window as any).electronAPI.onDeepLink((url: string) => {
            handleAuthUrl(url);
          });
        }
      }
    };
    setupTauriListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [serverUrl, token, handleAuthUrl, verifyToken]);

  const connectBrowser = async () => {
    const authUrl = `${serverUrl}/auth/studio-connect`;
    try {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(authUrl);
    } catch {
      if ((window as any).electronAPI?.openExternal) {
        (window as any).electronAPI.openExternal(authUrl);
      } else {
        window.open(authUrl, '_blank');
      }
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('saints_studio_token');
  };

  const setManualToken = async (manualToken: string) => {
    return verifyToken(manualToken.trim());
  };

  return (
    <DesktopAuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        serverUrl,
        setServerUrl,
        connectBrowser,
        logout,
        setManualToken,
      }}
    >
      {children}
    </DesktopAuthContext.Provider>
  );
};

export const useDesktopAuth = () => {
  const ctx = useContext(DesktopAuthContext);
  if (!ctx) {
    throw new Error('useDesktopAuth must be used within DesktopAuthProvider');
  }
  return ctx;
};
