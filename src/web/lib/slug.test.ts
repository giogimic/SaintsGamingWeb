import { describe, expect, it } from "vitest";
import { generateSlug } from "./slug";

describe("generateSlug", () => {
  it("lowercases and hyphenates words", () => {
    expect(generateSlug("Hello World")).toBe("hello-world");
  });

  it("strips punctuation and collapses separators", () => {
    expect(generateSlug("  What's Up?!  ")).toBe("what-s-up");
    expect(generateSlug("foo___bar")).toBe("foo-bar");
  });

  it("trims leading and trailing hyphens", () => {
    expect(generateSlug("---Edge---")).toBe("edge");
  });

  it("returns empty string for non-alphanumeric input", () => {
    expect(generateSlug("!!!")).toBe("");
  });
});
