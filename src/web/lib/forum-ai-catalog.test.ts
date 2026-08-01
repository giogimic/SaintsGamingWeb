import { describe, expect, it } from "vitest";
import {
  LOCAL_MODEL_CATALOG,
  buildEnhancePrompt,
  getModelOption,
} from "./forum-ai-catalog";

describe("forum-ai-catalog", () => {
  it("lists models with increasing RAM tiers", () => {
    expect(LOCAL_MODEL_CATALOG.length).toBeGreaterThanOrEqual(4);
    for (const m of LOCAL_MODEL_CATALOG) {
      expect(m.ramGb).toBeGreaterThan(0);
      expect(m.downloadGb).toBeGreaterThan(0);
    }
    const tiny = getModelOption("tinyllama");
    const heavy = getModelOption("qwen2.5:14b");
    expect(tiny && heavy && tiny.ramGb < heavy.ramGb).toBe(true);
  });

  it("builds grammar and polish prompts", () => {
    expect(buildEnhancePrompt("Hello", "grammar")).toContain("grammar");
    expect(buildEnhancePrompt("Hello", "polish")).toContain("polish");
    expect(buildEnhancePrompt("Hello", "polish")).toContain("Hello");
  });
});
