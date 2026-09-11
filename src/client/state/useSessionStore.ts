/**
 * Session Store — Auth, permissions, connection status, active scene.
 *
 * This is the "root orchestrator" store that manages the client lifecycle
 * and decides which scene is active. It has zero dependency on React rendering.
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type ClientScene =
  | 'title'
  | 'login'
  | 'server_select'
  | 'character_select'
  | 'character_create'
  | 'exploring'
  | 'battle'
  | 'offline';

export type BootState = 
  | 'TITLE'
  | 'AUTH'
  | 'REGISTRY'
  | 'CONNECT'
  | 'JOIN_WORLD'
  | 'LOAD_MANIFEST'
  | 'REQUEST_SPAWN_REGION'
  | 'VERIFY_DECODE'
  | 'EXTRACT_SPAWN'
  | 'MESH'
  | 'VALIDATE_SPAWN'
  | 'READY';

export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

export interface SessionState {
  // Auth
  accountId: string | null;
  characterId: string | null;
  characterName: string | null;
  permissionLevel: number;
  isAuthenticated: boolean;

  // Scene & Boot
  activeScene: ClientScene;
  bootState: BootState;
  setScene: (scene: ClientScene) => void;
  setBootState: (state: BootState) => void;

  // Connection
  connectionStatus: ConnectionStatus;
  latencyMs: number;
  serverTimeOffset: number;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setLatencyMs: (ms: number) => void;
  setServerTimeOffset: (offset: number) => void;

  // Mode
  isStudioMode: boolean;
  setStudioMode: (enabled: boolean) => void;

  // Mobile
  isMobile: boolean;
  viewportReady: boolean;
  uiScale: number;
  setMobileState: (isMobile: boolean, uiScale: number) => void;
  setViewportReady: (ready: boolean) => void;

  // Auth actions
  setAuth: (data: {
    accountId: string;
    permissionLevel: number;
  }) => void;
  setCharacter: (charId: string | null, charName?: string | null) => void;
  clearAuth: () => void;
}

export const useSessionStore = create<SessionState>()(
  subscribeWithSelector(
    immer((set) => ({
      // Auth
      accountId: null,
      characterId: null,
      characterName: null,
      permissionLevel: 0,
      isAuthenticated: false,

      // Scene & Boot
      activeScene: 'title' as ClientScene,
      bootState: 'TITLE' as BootState,
      setScene: (scene) => set((s) => { s.activeScene = scene; }),
      setBootState: (state) => set((s) => { s.bootState = state; }),

      // Connection
      connectionStatus: 'disconnected' as ConnectionStatus,
      latencyMs: 0,
      serverTimeOffset: 0,
      setConnectionStatus: (status) => set((s) => { s.connectionStatus = status; }),
      setLatencyMs: (ms) => set((s) => { s.latencyMs = ms; }),
      setServerTimeOffset: (offset) => set((s) => { s.serverTimeOffset = offset; }),

      // Mode
      isStudioMode: false,
      setStudioMode: (enabled) => set((s) => { s.isStudioMode = enabled; }),

      // Mobile
      isMobile: false,
      viewportReady: false,
      uiScale: 1,
      setMobileState: (isMobile, uiScale) => set((s) => {
        s.isMobile = isMobile;
        s.uiScale = uiScale;
      }),
      setViewportReady: (ready) => set((s) => { s.viewportReady = ready; }),

      // Auth actions
      setAuth: (data) => set((s) => {
        s.accountId = data.accountId;
        s.permissionLevel = data.permissionLevel;
        s.isAuthenticated = true;
      }),
      setCharacter: (charId, charName) => set((s) => {
        s.characterId = charId;
        s.characterName = charName ?? null;
      }),
      clearAuth: () => set((s) => {
        s.accountId = null;
        s.characterId = null;
        s.characterName = null;
        s.permissionLevel = 0;
        s.isAuthenticated = false;
        s.bootState = 'TITLE';
      }),
    }))
  )
);

/** Helper to get current authoritative server time based on offset */
export function getServerTime(): number {
  const state = useSessionStore.getState();
  return performance.now() + state.serverTimeOffset;
}
