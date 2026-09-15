import { prisma } from '@/web/lib/prisma';
import type { CompilerContext } from './types';
import { CANONICAL_ABILITIES } from '@/shared/game/combat/abilityRegistry';

/**
 * GameplayDependencyResolver
 * 
 * Rules:
 * 1. Only exactly the required items, quests, and abilities are packaged.
 * 2. Unused abilities are NOT automatically packaged unless explicitly defined as a global runtime contract.
 */
export async function resolveGameplay(ctx: CompilerContext): Promise<void> {
  // 1. Resolve Quests
  const resolvedQuests = new Set(ctx.manifest.gameplay.quests.map((q: any) => q.slug));
  const pendingQuests = Array.from(ctx.requiredQuests).filter(s => !resolvedQuests.has(s));
  if (pendingQuests.length > 0) {
    const quests = await prisma.questTemplate.findMany({ 
      where: { slug: { in: pendingQuests } },
      include: { objectives: true }
    });
    
    for (const slug of pendingQuests) {
      const quest = quests.find(q => q.slug === slug);
      if (!quest) {
        ctx.errors.push(`Missing QuestTemplate for slug '${slug}'`);
        continue;
      }
      
      // Scan for item rewards
      try {
        const rewards = JSON.parse(quest.rewards || '[]');
        for (const r of rewards) {
          if (r.type === 'ITEM' && r.itemSlug) ctx.requiredItems.add(r.itemSlug);
        }
      } catch(e) {}
      
      ctx.manifest.gameplay.quests.push(quest);
    }
  }

  // 2. Resolve Items
  const resolvedItems = new Set(ctx.manifest.items.map((i: any) => i.slug));
  const pendingItems = Array.from(ctx.requiredItems).filter(s => !resolvedItems.has(s));
  if (pendingItems.length > 0) {
    const items = await prisma.itemTemplate.findMany({ 
      where: { slug: { in: pendingItems } } 
    });

    for (const slug of pendingItems) {
      const it = items.find(i => i.slug === slug);
      if (!it) {
        ctx.errors.push(`Missing ItemTemplate for slug '${slug}'`);
        continue;
      }
      
      // Items might have abilities or classes, but for now they are terminal
      ctx.manifest.items.push(it);
    }
  }

  // 3. Resolve Abilities
  const resolvedAbilities = new Set(ctx.manifest.gameplay.abilities.map((a: any) => a.slug));
  const pendingAbilities = Array.from(ctx.requiredAbilities).filter(s => !resolvedAbilities.has(s));
  for (const slug of pendingAbilities) {
    if (CANONICAL_ABILITIES[slug]) {
      ctx.manifest.gameplay.abilities.push(CANONICAL_ABILITIES[slug]);
    } else {
      ctx.errors.push(`Missing canonical ability '${slug}'`);
    }
  }
}

/**
 * AssetDependencyResolver
 * 
 * Future-proofing: Here we would scan the manifest for media assets
 * (sprites, models, audio) and add them to ctx.requiredAssets.
 * Then we would validate they exist in Cloud Storage / CDN.
 */
export async function resolveAssets(ctx: CompilerContext): Promise<void> {
  const assetSet = new Set<string>();
  
  // Scan NPCs
  for (const npc of ctx.manifest.actors.npcs) {
    if (npc.worldModel) assetSet.add(npc.worldModel);
    if (npc.capabilities?.shopInventory) {
      // Just in case shop inventory has explicit icons
    }
  }
  
  // Scan Creatures
  for (const c of ctx.manifest.actors.creatures) {
    if (c.spriteId) assetSet.add(c.spriteId);
    if (c.spriteUrl) assetSet.add(c.spriteUrl);
  }
  for (const c of ctx.manifest.actors.monsters) {
    if (c.spriteId) assetSet.add(c.spriteId);
    if (c.spriteUrl) assetSet.add(c.spriteUrl);
  }
  
  // Scan Items
  for (const item of ctx.manifest.items) {
    if (item.iconAssetId) assetSet.add(item.iconAssetId);
    if (item.modelUrl) assetSet.add(item.modelUrl);
  }
  
  // Ensure identities exist in DB (if they are CUIDs)
  const allRefs = Array.from(assetSet).filter(Boolean);
  
  // We can lookup UsableAssets and SourceAssets to guarantee existence
  const cuidRefs = allRefs.filter(ref => ref.length > 20 && !ref.includes('/'));
  
  if (cuidRefs.length > 0) {
    const usableAssets = await prisma.usableAsset.findMany({
      where: { id: { in: cuidRefs } },
      select: { id: true, sourceAssetId: true }
    });
    
    const sourceAssets = await prisma.sourceAsset.findMany({
      where: { id: { in: cuidRefs } },
      select: { id: true }
    });
    
    const foundIds = new Set([
      ...usableAssets.map(u => u.id),
      ...sourceAssets.map(s => s.id)
    ]);
    
    for (const ref of cuidRefs) {
      if (!foundIds.has(ref)) {
        ctx.errors.push(`Missing Asset Dependency: Asset ID '${ref}' does not exist in UsableAsset or SourceAsset registry.`);
      }
    }
  }
  
  ctx.manifest.assets = allRefs;
}
