import React, { createContext, useContext } from 'react';
import { useDesktopAuth } from './DesktopAuthProvider';

interface SessionContextType {
  data: {
    user: {
      id: string;
      name: string;
      email: string;
      image: string | null;
      permissionLevel: number;
    } | null;
  } | null;
  status: 'authenticated' | 'unauthenticated' | 'loading';
}

const SessionContext = createContext<SessionContextType>({
  data: null,
  status: 'loading',
});

export const NextAuthShimProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useDesktopAuth();

  const sessionData = user
    ? {
        user: {
          id: user.id,
          name: user.displayName || user.username,
          email: user.email,
          image: user.image,
          permissionLevel: user.permissionLevel,
        },
      }
    : null;

  const status = isLoading
    ? 'loading'
    : isAuthenticated
    ? 'authenticated'
    : 'unauthenticated';

  return (
    <SessionContext.Provider value={{ data: sessionData, status }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
