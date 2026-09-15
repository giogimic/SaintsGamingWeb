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
  const pendingQuests = Array.from(ctx.requiredQuests);
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
  const pendingItems = Array.from(ctx.requiredItems);
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
  const pendingAbilities = Array.from(ctx.requiredAbilities);
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
  // Currently a no-op until we implement strict asset packing
}
