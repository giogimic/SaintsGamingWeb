import { describe, expect, it } from "vitest";
import {
  isProxyShellMapDoc,
  mapVisualFingerprint,
  MAP_DOC_SOURCE_PROXY_SHELL,
  resolveMapDimensions,
  shouldAcceptMapDoc,
  shouldRemeshMapDoc,
} from "./mapDocVisual";

const shell = {
  id: "DEMO_SANDBOX",
  source: MAP_DOC_SOURCE_PROXY_SHELL,
  grid: Array(20)
    .fill(0)
    .map(() => Array(20).fill(0)),
  tilesets: [],
  tileLayers: [],
  npcs: [],
};

const rich = {
  id: "DEMO_SANDBOX",
  source: "worldMap" as const,
  version: 3,
  width: 30,
  height: 30,
  grid: Array(30)
    .fill(0)
    .map(() => Array(30).fill(0)),
  tilesets: [{ firstgid: 1 }],
  tileLayers: [
    {
      name: "Ground",
      grid: Array(30)
        .fill(0)
        .map(() => Array(30).fill(17)),
    },
  ],
  npcs: [{ id: "a" }],
};

describe("mapDocVisual", () => {
  it("detects proxy shells", () => {
    expect(isProxyShellMapDoc(shell)).toBe(true);
    expect(isProxyShellMapDoc(rich)).toBe(false);
    expect(isProxyShellMapDoc(null)).toBe(true);
  });

  it("prefers tileLayers over stale meta / empty logic grid", () => {
    expect(resolveMapDimensions({ width: 40, height: 12, grid: [[0, 0]] })).toEqual({
      width: 2,
      height: 1,
    });
    expect(
      resolveMapDimensions({
        width: 24,
        height: 24,
        grid: [],
        tileLayers: [{ grid: Array(30).fill(0).map(() => Array(30).fill(17)) }],
      })
    ).toEqual({ width: 30, height: 30 });
    expect(resolveMapDimensions({ width: 40, height: 12 })).toEqual({
      width: 40,
      height: 12,
    });
  });

  it("accepts DB doc over shell and rejects shell downgrade", () => {
    expect(shouldAcceptMapDoc(shell, rich)).toBe(true);
    expect(shouldAcceptMapDoc(rich, shell)).toBe(false);
  });

  it("ignores NPC-only object identity churn (lobby MP)", () => {
    const withMoreNpcs = { ...rich, npcs: [{ id: "a" }, { id: "b" }] };
    expect(mapVisualFingerprint(rich)).toBe(mapVisualFingerprint(withMoreNpcs));
    expect(shouldAcceptMapDoc(rich, withMoreNpcs)).toBe(false);
    expect(shouldRemeshMapDoc(rich, withMoreNpcs)).toBe(false);
  });

  it("remeshes on version / visual upgrade", () => {
    const v4 = { ...rich, version: 4 };
    expect(shouldAcceptMapDoc(rich, v4)).toBe(true);
    expect(shouldRemeshMapDoc(rich, v4)).toBe(true);
  });
});
