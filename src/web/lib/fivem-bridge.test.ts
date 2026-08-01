import { describe, expect, it } from "vitest";
import { applyBankDelta, normalizeFivemLicense } from "./fivem-bridge-utils";
import {
  FivemBankUpdatedSchema,
  FivemCharacterUpdatedSchema,
  FivemPlayerOfflineSchema,
  FivemPlayerOnlineSchema,
} from "../../shared/events/registry";

describe("normalizeFivemLicense", () => {
  it("strips license: prefix and lowercases", () => {
    expect(normalizeFivemLicense("license:AbC123")).toBe("abc123");
    expect(normalizeFivemLicense("  XYZ  ")).toBe("xyz");
  });
});

describe("applyBankDelta", () => {
  it("moves cash to bank on DEPOSIT", () => {
    expect(applyBankDelta(1000, 500, "DEPOSIT", 200)).toEqual({ cash: 300, bank: 1200 });
  });

  it("moves bank to cash on WITHDRAWAL and floors at 0", () => {
    expect(applyBankDelta(100, 0, "WITHDRAWAL", 250)).toEqual({ cash: 250, bank: 0 });
  });

  it("applies signed ADJUST to bank", () => {
    expect(applyBankDelta(1000, 50, "SALARY", 500)).toEqual({ cash: 50, bank: 1500 });
  });
});

describe("fivem event schemas", () => {
  it("parses player online/offline payloads", () => {
    expect(
      FivemPlayerOnlineSchema.parse({
        userId: "u1",
        fivemLicense: "abc",
        characterName: "John Doe",
        playerCount: 12,
      })
    ).toMatchObject({ userId: "u1", playerCount: 12 });

    expect(
      FivemPlayerOfflineSchema.parse({
        userId: "u1",
        fivemLicense: "abc",
      })
    ).toMatchObject({ userId: "u1" });
  });

  it("parses character and bank update payloads", () => {
    expect(
      FivemCharacterUpdatedSchema.parse({
        userId: "u1",
        characterId: "c1",
        characterName: "Jane Doe",
        cash: 100,
        bank: 5000,
        health: 200,
        armor: 0,
        isDead: false,
      })
    ).toMatchObject({ bank: 5000 });

    expect(
      FivemBankUpdatedSchema.parse({
        userId: "u1",
        characterId: "c1",
        characterName: "Jane Doe",
        transactionType: "DEPOSIT",
        amount: 200,
        cash: 0,
        bank: 5200,
      })
    ).toMatchObject({ transactionType: "DEPOSIT" });
  });
});
