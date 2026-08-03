import { describe, expect, it } from "vitest";
import { isRemarkableCapture } from "./remarkableCapture";

describe("isRemarkableCapture", () => {
  it("flags first-of-species", () => {
    expect(
      isRemarkableCapture({ tag: "Wild · Geo", stage: "basic", catchRate: 1, isFirstOfSpecies: true })
    ).toBe(true);
  });

  it("flags legendary/rare tags", () => {
    expect(
      isRemarkableCapture({ tag: "Legendary · Solar", stage: "basic", catchRate: 1, isFirstOfSpecies: false })
    ).toBe(true);
  });

  it("flags non-basic stage", () => {
    expect(
      isRemarkableCapture({ tag: "Wild", stage: "stage2", catchRate: 1, isFirstOfSpecies: false })
    ).toBe(true);
  });

  it("flags low catchRate", () => {
    expect(
      isRemarkableCapture({ tag: "Wild", stage: "basic", catchRate: 0.2, isFirstOfSpecies: false })
    ).toBe(true);
  });

  it("skips common duplicates", () => {
    expect(
      isRemarkableCapture({ tag: "Wild · Geo", stage: "basic", catchRate: 1, isFirstOfSpecies: false })
    ).toBe(false);
  });
});
