import React, { useEffect } from 'react';
import { useSessionStore } from './state/useSessionStore';
import { TitleScene } from './scenes/TitleScene';
import { LoginScene } from './scenes/LoginScene';
import { ServerSelectScene } from './scenes/ServerSelectScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { CharacterCreateScene } from './scenes/CharacterCreateScene';
import { ExploringScene } from './scenes/ExploringScene';
import { BattleScene } from './scenes/BattleScene';
import { OfflineScene } from './scenes/OfflineScene';
import { inputManager } from './input/InputManager';
import { gameLoop } from './loop/GameLoop';
import { socketManager } from './net/SocketManager';
import { registerAllHandlers } from './net/SocketEventRouter';
import { useSession } from 'next-auth/react';

/**
 * Root Game Client component.
 * Mounts the appropriate scene based on the current session state.
 */
export function ClientApp() {
  const activeScene = useSessionStore((s) => s.activeScene);
  const { data: session, status } = useSession();

  // Network & Socket connection
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      socketManager.connect({
        accountId: session.user.id,
        onConnect: () => {
          registerAllHandlers();
        },
        onDisconnect: (reason) => {
          // Handled internally by socketManager state but can hook UI here
        },
        onReconnecting: () => {
        },
        onSessionReplaced: () => {
          // Handled internally
        }
      });
    }

    return () => {
      // We do NOT disconnect on component unmount to prevent rapid reconnects during HMR.
      // The SocketManager singleton handles lifecycle itself.
    };
  }, [status, session?.user?.id]);

  // Mount systems
  useEffect(() => {
    inputManager.attach(null);
    gameLoop.start();

    return () => {
      inputManager.detach();
      gameLoop.stop();
    };
  }, []);

  // Monitor viewport for mobile
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth <= 768;
      const scale = isMobile ? window.innerWidth / 1280 : 1;
      useSessionStore.getState().setMobileState(isMobile, scale);
      useSessionStore.getState().setViewportReady(true);
    };

    window.addEventListener('resize', checkMobile);
    checkMobile();

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden bg-black text-white select-none">
      {activeScene === 'title' && <TitleScene />}
      {activeScene === 'login' && <LoginScene />}
      {activeScene === 'server_select' && <ServerSelectScene />}
      {activeScene === 'character_select' && <CharacterSelectScene />}
      {activeScene === 'character_create' && <CharacterCreateScene />}
      {activeScene === 'exploring' && <ExploringScene />}
      {activeScene === 'battle' && <BattleScene />}
      {activeScene === 'offline' && <OfflineScene />}
    </div>
  );
}
