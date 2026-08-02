/**
 * Shared dialogue tree cache — used by DialogueManager + Studio server actions.
 * Keyed by npcId; value includes updatedAt so Studio edits invalidate naturally.
 */

export type CachedDialogue = { tree: unknown; updatedAt: string };

export const dialogueCache: Record<string, CachedDialogue> = {};

export function invalidateDialogueCache(npcId?: string) {
  if (!npcId) {
    for (const k of Object.keys(dialogueCache)) delete dialogueCache[k];
    return;
  }
  const bare = String(npcId).replace(/^npc_/, "").replace(/_\d{10,}$/, "");
  for (const k of Object.keys(dialogueCache)) {
    if (k === npcId || k === bare || k === `npc_${bare}` || k.includes(bare)) {
      delete dialogueCache[k];
    }
  }
}
