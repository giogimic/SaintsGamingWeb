/**
 * Boot Sequence — Auth → Registry → Character → Socket pipeline.
 *
 * Orchestrates the game client initialization lifecycle as a clean async
 * pipeline instead of the tangled useEffect chains in the old index.tsx.
 *
 * Each step is individually testable and retryable.
 */
import { useSessionStore } from '../state/useSessionStore';
import { useWorldStore } from '../state/useWorldStore';
import { useHudStore } from '../state/useHudStore';
import { usePlayerStore } from '../state/usePlayerStore';
import { socketManager } from '../net/SocketManager';
import { registerAllHandlers, unregisterAllHandlers } from '../net/SocketEventRouter';

export interface BootConfig {
  /** The authenticated account ID from NextAuth. */
  accountId: string;
  /** Permission level (0 = user, 1 = mod, 2 = admin). */
  permissionLevel: number;
  /** Character ID to load (null = show character select). */
  characterId?: string | null;
  /** Character name. */
  characterName?: string;
  /** Map to join (defaults to LOBBY). */
  initialMapId?: string;
  /** Whether this is a Studio session. */
  isStudio?: boolean;
}

export interface BootResult {
  success: boolean;
  error?: string;
}

/**
 * Run the full boot pipeline.
 */
export async function runBootSequence(config: BootConfig): Promise<BootResult> {
  const session = useSessionStore.getState();

  try {
    session.setBootState('TITLE');
    
    // ── Step 1: Auth ─────────────────────────────────────────────────────
    console.log('[Boot] Step 1/5: Setting auth...');
    session.setBootState('AUTH');
    session.setAuth({
      accountId: config.accountId,
      permissionLevel: config.permissionLevel,
    });

    if (config.characterId) {
      session.setCharacter(config.characterId, config.characterName);
    }

    if (config.isStudio) {
      session.setStudioMode(true);
    }

    // ── Step 2: Hydrate HUD from localStorage ────────────────────────────
    console.log('[Boot] Step 2/5: Hydrating HUD presets...');
    const hud = useHudStore.getState();
    hud.hydrateHudPresets();
    hud.hydrateMobileControlMode();

    // ── Step 3: Fetch Game Registry ──────────────────────────────────────
    console.log('[Boot] Step 3/5: Fetching game registry...');
    session.setBootState('REGISTRY');
    await useWorldStore.getState().fetchGameRegistry();
    await useWorldStore.getState().fetchLogicTiles();

    // ── Step 4: Load Character Data ──────────────────────────────────────
    console.log('[Boot] Step 4/5: Loading character data...');
    if (config.characterId) {
      try {
        const res = await fetch(`/api/characters/${config.characterId}`);
        if (res.ok) {
          const charData = await res.json();
          usePlayerStore.getState().hydratePlayer(charData);
        }
      } catch (e) {
        console.warn('[Boot] Character load failed, using defaults:', e);
      }
    }

    // ── Step 5: Connect Socket ───────────────────────────────────────────
    console.log('[Boot] Step 5/5: Connecting socket...');
    session.setBootState('CONNECT');
    socketManager.connect({
      accountId: config.accountId,
      onConnect: () => {
        if (useSessionStore.getState().bootState === 'FATAL_ERROR') {
          console.warn('[Boot] Aborting socket auto-join because bootState is FATAL_ERROR');
          return;
        }

        useSessionStore.getState().setConnectionStatus('connected');
        registerAllHandlers();

        // If we have a character, auto-join the map
        if (config.characterId) {
          const mapId = config.initialMapId || 'LOBBY';
          const joinSeq = useWorldStore.getState().incrementWorldJoinSeq();

          socketManager.emit('join_map', {
            accountId: config.accountId,
            characterId: config.characterId!,
            mapId,
            lobby: true,
            name: config.characterName || 'Saint',
            assetProfileId: usePlayerStore.getState().player.assetProfileId,
            joinSeq,
          });

          useWorldStore.getState().setWorldSessionState('joining');
          useSessionStore.getState().setBootState('JOIN_WORLD');
        }
      },
      onDisconnect: (reason) => {
        useSessionStore.getState().setConnectionStatus('disconnected');
        unregisterAllHandlers();
      },
      onReconnecting: () => {
        useSessionStore.getState().setConnectionStatus('reconnecting');
      },
      onSessionReplaced: () => {
        useSessionStore.getState().setConnectionStatus('disconnected');
        useSessionStore.getState().setScene('offline');
      },
    });

    // Determine initial scene
    if (!config.characterId) {
      session.setScene('character_select');
    } else {
      session.setScene('login'); // Will transition to 'exploring' after map_joined
    }

    console.log('[Boot] Boot sequence complete');
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown boot error';
    console.error('[Boot] Failed:', msg);
    session.setScene('offline');
    return { success: false, error: msg };
  }
}

/**
 * Cleanly shut down the game client.
 */
export function shutdownClient(): void {
  console.log('[Boot] Shutting down client...');
  unregisterAllHandlers();
  socketManager.disconnect();
  useSessionStore.getState().clearAuth();
  useSessionStore.getState().setScene('title');
  useSessionStore.getState().setConnectionStatus('disconnected');
}
