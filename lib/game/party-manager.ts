/**
 * Party System - Multiplayer party management with Socket.IO
 */

import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';
import { useGameStore } from '@/components/the-lobby/store';

class PartyManager extends EventEmitter {
  private socket: Socket | null = null;
  private partyId: string | null = null;
  private isLeader: boolean = false;

  connect(userId: string) {
    this.socket = io('http://localhost:3001', {
      query: { userId }
    });

    this.socket.on('connect', () => {
      console.log('Connected to party server');
    });

    this.socket.on('party_invite', (data: { from: string; fromName: string }) => {
      console.log(`Party invite from ${data.fromName}`);
      // Show notification to user
      this.showPartyInvite(data.from, data.fromName);
    });

    this.socket.on('party_joined', (data: { partyId: string; members: any[] }) => {
      this.partyId = data.partyId;
      useGameStore.getState().setParty(data.members);
      console.log(`Joined party ${data.partyId}`);
    });

    this.socket.on('party_member_joined', (member: any) => {
      useGameStore.getState().addPartyMember(member);
    });

    this.socket.on('party_member_left', (userId: string) => {
      useGameStore.getState().removePartyMember(userId);
    });

    this.socket.on('party_disbanded', () => {
      this.partyId = null;
      this.isLeader = false;
      useGameStore.getState().clearParty();
    });

    this.socket.on('party_position_update', (data: { userId: string; position: { x: number; y: number } }) => {
      useGameStore.getState().updatePartyMemberPosition(data.userId, data.position);
    });
  }

  inviteToParty(userId: string) {
    if (!this.socket) return;
    this.socket.emit('invite_to_party', { targetUserId: userId });
  }

  acceptInvite(fromUserId: string) {
    if (!this.socket) return;
    this.socket.emit('accept_party_invite', { fromUserId });
  }

  declineInvite(fromUserId: string) {
    if (!this.socket) return;
    this.socket.emit('decline_party_invite', { fromUserId });
  }

  leaveParty() {
    if (!this.socket || !this.partyId) return;
    this.socket.emit('leave_party', { partyId: this.partyId });
    this.partyId = null;
    this.isLeader = false;
  }

  disbandParty() {
    if (!this.socket || !this.partyId || !this.isLeader) return;
    this.socket.emit('disband_party', { partyId: this.partyId });
    this.partyId = null;
    this.isLeader = false;
  }

  updatePosition(position: { x: number; y: number }) {
    if (!this.socket || !this.partyId) return;
    this.socket.emit('update_party_position', {
      partyId: this.partyId,
      position
    });
  }

  private showPartyInvite(fromUserId: string, fromName: string) {
    // This would show a UI notification
    console.log(`Show party invite UI for ${fromName}`);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const partyManager = new PartyManager();