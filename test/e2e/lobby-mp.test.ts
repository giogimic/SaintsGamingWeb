// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Socket } from 'socket.io-client';
import { prisma, ensureUser, connectAs, once } from './e2e-helpers';

describe('Lobby Multiplayer', () => {
  let sa: Socket;
  let sb: Socket;
  let aId: string;
  let bId: string;

  beforeAll(async () => {
    const a = await ensureUser('smoke_a');
    const b = await ensureUser('smoke_b');
    aId = a.id;
    bId = b.id;

    sa = await connectAs(a.id);
    sb = await connectAs(b.id);
  });

  afterAll(async () => {
    sa.disconnect();
    sb.disconnect();
    await prisma.$disconnect();
  });

  it('should place players in the same shard and make them mutually visible', async () => {
    const joinedA = once<{ instanceId?: string; mapId?: string }>(sa, 'map_joined');
    sa.emit('join_map', {
      mapId: 'DEMO_SANDBOX',
      lobby: true,
      name: 'SmokeA',
      x: 10,
      y: 10,
    });
    const mapA = await joinedA;
    expect(mapA.instanceId).toBeDefined();

    const peersOnB = once<Record<string, unknown>>(sb, 'map_players');
    const joinedB = once<{ instanceId?: string; mapId?: string }>(sb, 'map_joined');
    
    const aSawB = new Promise<{ name?: string; socketId?: string }>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout waiting A→SmokeB player_joined')), 12000);
      const handler = (data: { name?: string; socketId?: string }) => {
        if (data?.name === 'SmokeB') {
          clearTimeout(t);
          sa.off('player_joined', handler);
          resolve(data);
        }
      };
      sa.on('player_joined', handler);
    });

    sb.emit('join_map', {
      mapId: 'DEMO_SANDBOX',
      lobby: true,
      name: 'SmokeB',
      x: 12,
      y: 10,
    });

    const [mapB, peers, peerJoin] = await Promise.all([joinedB, peersOnB, aSawB]);
    
    expect(mapA.instanceId).toEqual(mapB.instanceId);
    expect(Object.keys(peers || {}).length).toBeGreaterThanOrEqual(1);
    expect(peerJoin?.name).toEqual('SmokeB');
  });

  it('should maintain seat and peers during soft rejoin (join-storm regression)', async () => {
    let aLeftB = false;
    const onLeft = (data: { socketId?: string }) => {
      if (data?.socketId === sa.id) aLeftB = true;
    };
    sb.on('player_left', onLeft);
    
    const aRejoined = once<{ instanceId?: string }>(sa, 'map_joined');
    const peersAfterStorm = once<Record<string, unknown>>(sa, 'map_players');
    sa.emit('join_map', {
      mapId: 'DEMO_SANDBOX',
      lobby: true,
      name: 'SmokeA',
      x: 10,
      y: 10,
    });
    const [mapA2, peers2] = await Promise.all([aRejoined, peersAfterStorm]);
    
    // Give B a beat to receive any leave/join
    await new Promise((r) => setTimeout(r, 300));
    sb.off('player_left', onLeft);

    expect(mapA2.instanceId).toBeDefined();
    expect(Object.keys(peers2 || {}).length).toBeGreaterThanOrEqual(1);
    expect(aLeftB).toBe(false);
  });

  it('should allow party invites between lobby sockets', async () => {
    const invite = once<{ fromName?: string; fromAccountId?: string }>(sb, "party_invite");
    const updateA = once<{ type?: string; members?: string[] }>(sa, "party_update");
    const updateB = once<{ type?: string; members?: string[] }>(sb, "party_update");

    sa.emit("party_invite", "smoke_b");
    const inv = await invite;
    expect(inv.fromAccountId).toEqual(aId);

    sb.emit("party_invite_accept");
    const [ua, ub] = await Promise.all([updateA, updateB]);

    const members = new Set([...(ua.members || []), ...(ub.members || [])]);
    expect(ua.type).toEqual("UPDATE");
    expect(members.has(aId)).toBe(true);
    expect(members.has(bId)).toBe(true);
  });

  it('should handle UI join storms without dropping peer visibility', async () => {
    const peersOnA = new Map<string, string>();
    const peersOnB = new Map<string, string>();
    let leftOnB = 0;
  
    sa.on("player_joined", (d: { socketId?: string; name?: string }) => {
      if (d?.socketId && d.socketId !== sa.id) peersOnA.set(d.socketId, d.name || "?");
    });
    sa.on("player_left", (d: { socketId?: string }) => {
      if (d?.socketId) peersOnA.delete(d.socketId);
    });
    sa.on("map_players", (players: Record<string, { name?: string }>) => {
      peersOnA.clear();
      for (const [id, p] of Object.entries(players || {})) {
        if (id !== sa.id) peersOnA.set(id, p?.name || "?");
      }
    });
  
    sb.on("player_joined", (d: { socketId?: string; name?: string }) => {
      if (d?.socketId && d.socketId !== sb.id) peersOnB.set(d.socketId, d.name || "?");
    });
    sb.on("player_left", (d: { socketId?: string }) => {
      if (d?.socketId === sa.id) leftOnB++;
      if (d?.socketId) peersOnB.delete(d.socketId);
    });
    sb.on("map_players", (players: Record<string, { name?: string }>) => {
      peersOnB.clear();
      for (const [id, p] of Object.entries(players || {})) {
        if (id !== sb.id) peersOnB.set(id, p?.name || "?");
      }
    });

    const emitLobbyJoin = (socket: Socket, name: string) => {
      socket.emit("join_map", {
        mapId: "DEMO_SANDBOX",
        lobby: true,
        name,
        x: 14,
        y: 15,
        spriteId: "adventurer",
      });
    };
  
    // A: UI storm — 3 rapid joins (load + connect + late)
    const ja1 = once<{ instanceId: string }>(sa, "map_joined");
    emitLobbyJoin(sa, "StormA");
    emitLobbyJoin(sa, "StormA");
    emitLobbyJoin(sa, "StormA");
    const mapA = await ja1;
    await new Promise((r) => setTimeout(r, 200));
  
    // B joins once
    const jb = once<{ instanceId: string }>(sb, "map_joined");
    emitLobbyJoin(sb, "StormB");
    const mapB = await jb;
    await new Promise((r) => setTimeout(r, 400));
  
    // A storms again after B is present
    leftOnB = 0;
    emitLobbyJoin(sa, "StormA");
    emitLobbyJoin(sa, "StormA");
    await new Promise((r) => setTimeout(r, 500));
  
    const same = mapA.instanceId === mapB.instanceId;
    const aSeesB = [...peersOnA.values()].includes("StormB") || peersOnA.size >= 1;
    const bSeesA = [...peersOnB.values()].some((n) => n === "StormA") || peersOnB.size >= 1;
  
    expect(same).toBe(true);
    expect(aSeesB).toBe(true);
    expect(bSeesA).toBe(true);
    expect(leftOnB > 0 && peersOnB.size === 0).toBe(false);
  });

  it('should issue session_replaced for dual-tabbing on same account', async () => {
    // 1. Establish initial map connection on SA1
    const ja1 = once<{ instanceId: string }>(sa, "map_joined");
    sa.emit("join_map", { mapId: "DEMO_SANDBOX", lobby: true, name: "AccA", x: 14, y: 15 });
    await ja1;

    // 2. Open a second socket for the same user Account A
    const replaced = once<{ reason?: string }>(sa, "session_replaced");
    const sa2 = await connectAs(aId);
    const ja2 = once<{ instanceId: string }>(sa2, "map_joined");
    const peersOnSa2 = once<Record<string, { name?: string }>>(sa2, "map_players");

    sa2.emit("join_map", { mapId: "DEMO_SANDBOX", lobby: true, name: "AccA-tab2", x: 14, y: 15 });
    
    // SA1 should get session_replaced, while SA2 successfully joins
    const [rep, mapA2, peers2] = await Promise.all([replaced, ja2, peersOnSa2]);
    const peerNames = Object.values(peers2 || {}).map((p) => p?.name);

    expect(rep?.reason).toBeDefined();
    expect(mapA2.instanceId).toBeDefined();

    // Verify SA2 still sees AccB
    expect(peerNames).toContain("StormB");

    sa2.disconnect();
  });
});
