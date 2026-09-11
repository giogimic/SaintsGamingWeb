/**
 * Socket Event Router — Typed event→handler dispatch.
 *
 * Registers all domain-specific handlers on the socket when the connection
 * is established. Each domain handler file is a pure function that reads/writes
 * the appropriate Zustand store — no React, no component lifecycle.
 *
 * Call `registerAllHandlers()` after socket connect to wire everything up.
 * Call `unregisterAllHandlers()` on disconnect to clean up.
 */
import { socketManager, type TypedSocket } from './SocketManager';
import * as movementHandlers from './handlers/movementHandlers';
import * as combatHandlers from './handlers/combatHandlers';
import * as chatHandlers from './handlers/chatHandlers';
import * as partyHandlers from './handlers/partyHandlers';
import * as creatureHandlers from './handlers/creatureHandlers';
import * as economyHandlers from './handlers/economyHandlers';
import * as worldHandlers from './handlers/worldHandlers';
import * as studioBridgeHandlers from './handlers/studioBridgeHandlers';

/**
 * Wire all domain handlers to the active socket.
 */
export function registerAllHandlers(): void {
  const socket = socketManager.raw;
  if (!socket) {
    console.error('[EventRouter] No socket available to register handlers');
    return;
  }

  console.log('[EventRouter] Registering all domain handlers...');
  
  // Ensure we don't stack multiple listeners if called on reconnect
  unregisterAllHandlers();

  // Movement & Prediction
  socket.on('player_moved', movementHandlers.onPlayerMoved);
  socket.on('move_ack', movementHandlers.onMoveAck);
  socket.on('position_correction', movementHandlers.onPositionCorrection);

  // Players
  socket.on('map_players', movementHandlers.onMapPlayers);
  socket.on('player_joined', movementHandlers.onPlayerJoined);
  socket.on('player_left', movementHandlers.onPlayerLeft);
  socket.on('player_defeated', movementHandlers.onPlayerDefeated);

  // World
  socket.on('map_joined', worldHandlers.onMapJoined);
  socket.on('join_rejected', worldHandlers.onJoinRejected);
  socket.on('content_reload', worldHandlers.onContentReload);
  socket.on('tile_changed', worldHandlers.onTileChanged);
  socket.on('chunk_data', worldHandlers.onChunkData);
  socket.on('voxel_edit', worldHandlers.onVoxelEdit);

  // Creatures
  socket.on('creature_spawned', creatureHandlers.onCreatureSpawned);
  socket.on('creature_despawned', creatureHandlers.onCreatureDespawned);
  socket.on('creature_moved', creatureHandlers.onCreatureMoved);
  socket.on('creature_hp_update', creatureHandlers.onCreatureHpUpdate);
  socket.on('starter_claimed', creatureHandlers.onStarterClaimed);

  // Combat & Battles
  socket.on('combat_update', combatHandlers.onCombatUpdate);
  socket.on('battle_started', combatHandlers.onBattleStarted);
  socket.on('battle_update', combatHandlers.onBattleUpdate);
  socket.on('battle_ended', combatHandlers.onBattleEnded);

  // Chat & Social
  socket.on('player_chat', chatHandlers.onPlayerChat);
  socket.on('global_chat_msg', chatHandlers.onGlobalChatMsg);
  socket.on('chat_message', chatHandlers.onChatMessage);
  socket.on('show_toast', chatHandlers.onShowToast);

  // Economy & Inventory
  socket.on('sync_credits', economyHandlers.onSyncCredits);
  socket.on('sync_hp', economyHandlers.onSyncHp);
  socket.on('inventory_sync', economyHandlers.onInventorySync);
  socket.on('skill_xp_gained', economyHandlers.onSkillXpGained);

  // Dialogue
  socket.on('dialogue_start', worldHandlers.onDialogueStart);
  socket.on('dialogue_end', worldHandlers.onDialogueEnd);

  // Quests
  socket.on('quest_update', economyHandlers.onQuestUpdate);

  // Party
  socket.on('party_invite', partyHandlers.onPartyInvite);
  socket.on('party_update', partyHandlers.onPartyUpdate);

  // Loot
  socket.on('loot_dropped', economyHandlers.onLootDropped);
  socket.on('loot_despawned', economyHandlers.onLootDespawned);

  // Studio bridge (only active when in studio mode)
  socket.on('studio_lock', studioBridgeHandlers.onStudioLock);
  socket.on('studio_unlock', studioBridgeHandlers.onStudioUnlock);
  socket.on('rule_trace', studioBridgeHandlers.onRuleTrace);

  // Diagnostics
  socket.on('pong', () => {
    // Latency handled by SocketManager ping cycle
  });

  console.log('[EventRouter] All handlers registered');
}

/**
 * Remove all domain handlers from the socket.
 */
export function unregisterAllHandlers(): void {
  const socket = socketManager.raw;
  if (!socket) return;

  socket.removeAllListeners('player_moved');
  socket.removeAllListeners('move_ack');
  socket.removeAllListeners('position_correction');
  socket.removeAllListeners('map_players');
  socket.removeAllListeners('player_joined');
  socket.removeAllListeners('player_left');
  socket.removeAllListeners('player_defeated');
  socket.removeAllListeners('map_joined');
  socket.removeAllListeners('join_rejected');
  socket.removeAllListeners('content_reload');
  socket.removeAllListeners('tile_changed');
  socket.removeAllListeners('chunk_data');
  socket.removeAllListeners('voxel_edit');
  socket.removeAllListeners('creature_spawned');
  socket.removeAllListeners('creature_despawned');
  socket.removeAllListeners('creature_moved');
  socket.removeAllListeners('creature_hp_update');
  socket.removeAllListeners('starter_claimed');
  socket.removeAllListeners('combat_update');
  socket.removeAllListeners('battle_started');
  socket.removeAllListeners('battle_update');
  socket.removeAllListeners('battle_ended');
  socket.removeAllListeners('player_chat');
  socket.removeAllListeners('global_chat_msg');
  socket.removeAllListeners('chat_message');
  socket.removeAllListeners('show_toast');
  socket.removeAllListeners('sync_credits');
  socket.removeAllListeners('sync_hp');
  socket.removeAllListeners('inventory_sync');
  socket.removeAllListeners('skill_xp_gained');
  socket.removeAllListeners('dialogue_start');
  socket.removeAllListeners('dialogue_end');
  socket.removeAllListeners('quest_update');
  socket.removeAllListeners('party_invite');
  socket.removeAllListeners('party_update');
  socket.removeAllListeners('loot_dropped');
  socket.removeAllListeners('loot_despawned');
  socket.removeAllListeners('studio_lock');
  socket.removeAllListeners('studio_unlock');
  socket.removeAllListeners('rule_trace');
  socket.removeAllListeners('pong');

  console.log('[EventRouter] All handlers unregistered');
}
