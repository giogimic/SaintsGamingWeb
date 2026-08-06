import { describe, expect, it } from "vitest";
import {
  buildJoinKey,
  shouldReplacePeerSnapshot,
  shouldSkipRedundantLobbyJoin,
} from "./lobbyJoin";

describe("lobbyJoin", () => {
  it("buildJoinKey normalizes base map", () => {
    expect(
      buildJoinKey({
        mapId: "DEMO_SANDBOX_ch2",
        lobby: true,
        isPrivate: false,
        pie: false,
      })
    ).toBe("DEMO_SANDBOX|lobby|pub|nopie");
  });

  it("skips redundant lobby join when already on public shard", () => {
    const contract = {
      mapId: "DEMO_SANDBOX",
      lobby: true,
      isPrivate: false,
      pie: false,
    };
    const key = buildJoinKey(contract);
    expect(
      shouldSkipRedundantLobbyJoin({
        contract,
        currentInstanceId: "DEMO_SANDBOX_ch1",
        lastJoinKey: key,
      })
    ).toBe(true);
  });

  it("does not skip when instance missing or key changed", () => {
    const contract = {
      mapId: "DEMO_SANDBOX",
      lobby: true,
      isPrivate: false,
      pie: false,
    };
    expect(
      shouldSkipRedundantLobbyJoin({
        contract,
        currentInstanceId: null,
        lastJoinKey: buildJoinKey(contract),
      })
    ).toBe(false);
    expect(
      shouldSkipRedundantLobbyJoin({
        contract,
        currentInstanceId: "DEMO_SANDBOX_ch1",
        lastJoinKey: "OTHER",
      })
    ).toBe(false);
  });

  it("does not skip Studio private/PIE joins", () => {
    expect(
      shouldSkipRedundantLobbyJoin({
        contract: {
          mapId: "DEMO_SANDBOX",
          lobby: false,
          isPrivate: true,
          pie: false,
        },
        currentInstanceId: "DEMO_SANDBOX_acc",
        lastJoinKey: "DEMO_SANDBOX|studio|priv|nopie",
      })
    ).toBe(false);
  });

  it("keeps peers when empty map_players hits a public shard", () => {
    expect(
      shouldReplacePeerSnapshot({
        incomingCount: 0,
        existingCount: 2,
        currentInstanceId: "DEMO_SANDBOX_ch1",
      })
    ).toBe(false);
    expect(
      shouldReplacePeerSnapshot({
        incomingCount: 1,
        existingCount: 2,
        currentInstanceId: "DEMO_SANDBOX_ch1",
      })
    ).toBe(true);
    expect(
      shouldReplacePeerSnapshot({
        incomingCount: 0,
        existingCount: 0,
        currentInstanceId: "DEMO_SANDBOX_ch1",
      })
    ).toBe(true);
  });

  it("keeps peers on lobby seat even when instanceId is still the base map", () => {
    expect(
      shouldReplacePeerSnapshot({
        incomingCount: 0,
        existingCount: 1,
        currentInstanceId: "DEMO_SANDBOX",
        lobbySeat: true,
      })
    ).toBe(false);
  });
});
