/**
 * ALIGNMENT E.3 — gate for auto SocialPost on capture.
 * Uses existing CreatureDef fields only (no new rarity schema).
 */
export function isRemarkableCapture(meta: {
  tag?: string | null;
  stage?: string | null;
  catchRate?: number | null;
  isFirstOfSpecies?: boolean;
}): boolean {
  const tag = String(meta.tag || "");
  const stage = String(meta.stage || "basic");
  const catchRate =
    typeof meta.catchRate === "number" && Number.isFinite(meta.catchRate)
      ? meta.catchRate
      : 1;
  const tagRare = /legend|mythic|rare|boss|epic|shiny|unique/i.test(tag);
  const stageRare = Boolean(stage && stage !== "basic");
  const rateRare = catchRate > 0 && catchRate < 0.5;
  return tagRare || stageRare || rateRare || Boolean(meta.isFirstOfSpecies);
}
