import { afterEach, describe, expect, it } from "vitest";
import { parseDiscordRoleMap } from "./discord-role-map";

describe("parseDiscordRoleMap", () => {
  const original = process.env.DISCORD_ROLE_MAP;

  afterEach(() => {
    if (original === undefined) delete process.env.DISCORD_ROLE_MAP;
    else process.env.DISCORD_ROLE_MAP = original;
  });

  it("returns empty object when unset", () => {
    delete process.env.DISCORD_ROLE_MAP;
    expect(parseDiscordRoleMap()).toEqual({});
  });

  it("parses role id → permission level map", () => {
    process.env.DISCORD_ROLE_MAP = JSON.stringify({
      "111": 200,
      "222": 400,
    });
    expect(parseDiscordRoleMap()).toEqual({ "111": 200, "222": 400 });
  });

  it("ignores invalid JSON", () => {
    process.env.DISCORD_ROLE_MAP = "{not-json";
    expect(parseDiscordRoleMap()).toEqual({});
  });
});
