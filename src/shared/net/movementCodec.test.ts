import { describe, expect, it } from "vitest";
import {
  decodeCreatureMoved,
  decodePlayerMoved,
  encodeCreatureMoved,
  encodePlayerMoved,
} from "./movementCodec";

describe("movementCodec", () => {
  it("round-trips player_moved binary payloads", () => {
    const original = {
      socketId: "sock_abc",
      entityId: "player_u1_1",
      x: 12,
      y: 34,
      direction: "right" as const,
      isMoving: true,
      hp: 80,
      maxHp: 100,
      name: "Tamer",
      spriteId: "adventurer",
    };
    const encoded = encodePlayerMoved(original);
    expect(encoded.byteLength).toBeLessThan(120);
    const decoded = decodePlayerMoved(encoded);
    expect(decoded).toEqual(original);
  });

  it("round-trips creature_moved binary payloads", () => {
    const original = {
      entityId: "creature_1",
      x: 5,
      y: 9,
      direction: "up" as const,
      isMoving: false,
      hp: 20,
      maxHp: 40,
      ownerId: "",
      behavior: "WANDER",
    };
    const encoded = encodeCreatureMoved(original);
    const decoded = decodeCreatureMoved(encoded);
    expect(decoded).toEqual(original);
  });
});
