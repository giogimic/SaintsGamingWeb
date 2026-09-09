/**
 * Party Handlers — party_invite, party_update.
 */
import type {
  PartyInvitePayload,
  PartyUpdatePayload,
} from '../protocol.d';
import { useMultiplayerStore } from '../../state/useMultiplayerStore';
import { useToastStore } from '../../state/useToastStore';

/**
 * Received a party invitation.
 */
export function onPartyInvite(data: PartyInvitePayload): void {
  useToastStore.getState().showToast(
    `${data.fromName || 'Someone'} invited you to a party!`,
  );
  // TODO: Show accept/decline UI in Phase 4
}

/**
 * Party state changed — members joined/left/disbanded.
 */
export function onPartyUpdate(data: PartyUpdatePayload): void {
  if (data.type === 'DISBANDED' || data.type === 'LEFT') {
    useMultiplayerStore.getState().clearParty();
    useToastStore.getState().showToast('Party disbanded');
    return;
  }

  // Full member list update
  if (data.members) {
    // Server sends account IDs — we'll resolve names from peer snapshots
    // For now just track member count
    useToastStore.getState().showToast(`Party updated: ${data.members.length} members`);
  }
}
