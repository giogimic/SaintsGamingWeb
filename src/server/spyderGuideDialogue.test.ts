import { describe, expect, it } from "vitest";
import { resolveAzureGuideStartNode } from "./spyderGuideDialogue";

describe("resolveAzureGuideStartNode", () => {
  it("offers accept when no Spyder quests started", () => {
    expect(
      resolveAzureGuideStartNode({
        hasPartyCreature: false,
        active: null,
        completedSlugs: new Set(),
      })
    ).toBe("node_start");
  });

  it("reminds during welcome active", () => {
    expect(
      resolveAzureGuideStartNode({
        hasPartyCreature: true,
        active: { slug: "quest_azure_welcome", status: "ACTIVE", currentStage: 1 },
        completedSlugs: new Set(),
      })
    ).toBe("node_welcome_active");
  });

  it("points to townsfolk / route / report by active quest", () => {
    expect(
      resolveAzureGuideStartNode({
        hasPartyCreature: true,
        active: { slug: "quest_azure_townsfolk", status: "ACTIVE", currentStage: 1 },
        completedSlugs: new Set(["quest_azure_welcome"]),
      })
    ).toBe("node_townsfolk");

    expect(
      resolveAzureGuideStartNode({
        hasPartyCreature: true,
        active: { slug: "quest_spyder_first_capture", status: "ACTIVE", currentStage: 1 },
        completedSlugs: new Set(["quest_azure_welcome", "quest_azure_townsfolk"]),
      })
    ).toBe("node_capture_go");

    expect(
      resolveAzureGuideStartNode({
        hasPartyCreature: true,
        active: { slug: "quest_spyder_first_capture", status: "ACTIVE", currentStage: 2 },
        completedSlugs: new Set(["quest_azure_welcome", "quest_azure_townsfolk"]),
      })
    ).toBe("node_capture_report");
  });

  it("gates capture path when no party creature", () => {
    expect(
      resolveAzureGuideStartNode({
        hasPartyCreature: false,
        active: { slug: "quest_spyder_first_capture", status: "ACTIVE", currentStage: 1 },
        completedSlugs: new Set(["quest_azure_welcome"]),
      })
    ).toBe("node_need_starter");
  });

  it("points to Cotton locals, then tunnel, then done", () => {
    expect(
      resolveAzureGuideStartNode({
        hasPartyCreature: true,
        active: { slug: "quest_spyder_cotton_locals", status: "ACTIVE", currentStage: 1 },
        completedSlugs: new Set([
          "quest_azure_welcome",
          "quest_azure_townsfolk",
          "quest_spyder_first_capture",
          "quest_spyder_cotton_arrive",
        ]),
      })
    ).toBe("node_cotton_locals");

    expect(
      resolveAzureGuideStartNode({
        hasPartyCreature: true,
        active: { slug: "quest_spyder_cotton_tunnel", status: "ACTIVE", currentStage: 1 },
        completedSlugs: new Set([
          "quest_azure_welcome",
          "quest_azure_townsfolk",
          "quest_spyder_first_capture",
          "quest_spyder_cotton_arrive",
          "quest_spyder_cotton_locals",
        ]),
      })
    ).toBe("node_cotton_tunnel");

    expect(
      resolveAzureGuideStartNode({
        hasPartyCreature: true,
        active: null,
        completedSlugs: new Set([
          "quest_azure_welcome",
          "quest_azure_townsfolk",
          "quest_spyder_first_capture",
          "quest_spyder_cotton_arrive",
          "quest_spyder_cotton_locals",
          "quest_spyder_cotton_tunnel",
        ]),
      })
    ).toBe("node_done");
  });
});
