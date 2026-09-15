import { prisma } from '@/web/lib/prisma';
import type { CompilerContext } from './types';

/**
 * ActorDependencyResolver
 * 
 * Rules:
 * 1. Performs transitive dependency lookups from Canonical Working Data.
 * 2. Does NOT use runtime registries (e.g. Go memory or REDIS).
 * 3. Packages only exactly the requested dependencies.
 */
export async function resolveActors(ctx: CompilerContext): Promise<void> {
  // 1. Resolve NPCs
  const resolvedNpcs = new Set(ctx.manifest.actors.npcs.map((n: any) => n.slug));
  const pendingNpcs = Array.from(ctx.requiredNPCs).filter(slug => !resolvedNpcs.has(slug));
  
  if (pendingNpcs.length > 0) {
    const npcs = await prisma.npcDef.findMany({ 
      where: { slug: { in: pendingNpcs } } 
    });

    const dialogueIds = new Set<string>();
    for (const npc of npcs) {
      try {
        const parsed = JSON.parse(npc.componentsData || '{}');
        if (parsed.behavior?.dialogueId) {
          dialogueIds.add(parsed.behavior.dialogueId);
        } else {
          dialogueIds.add(npc.slug);
        }
      } catch (e) { 
        dialogueIds.add(npc.slug); 
      }
    }

    const dialogues = await prisma.npcDialogueTree.findMany({ 
      where: { npcId: { in: Array.from(dialogueIds) } } 
    });
    
    const dialogueMap = new Map(dialogues.map(d => [d.npcId, d.data]));

    for (const slug of pendingNpcs) {
      const npcDef = npcs.find(n => n.slug === slug);
      if (!npcDef) {
        ctx.errors.push(`Missing NpcDef for slug '${slug}'`);
        continue;
      }

      let parsedComponents: any = {};
      try { 
        parsedComponents = JSON.parse(npcDef.componentsData || '{}'); 
      } catch (e) {}

      let dialogueTree = null;
      const dId = parsedComponents.behavior?.dialogueId || npcDef.slug;
      if (dialogueMap.has(dId)) {
        try {
          dialogueTree = JSON.parse(dialogueMap.get(dId)!);
          // Register Quests triggered by Dialogue
          const scanDialogue = (node: any) => {
            if (node.choices) {
              for (const choice of node.choices) {
                if (choice.questSlug) ctx.requiredQuests.add(choice.questSlug);
              }
            }
            if (node.options) {
              for (const opt of node.options) {
                if (opt.questSlug) ctx.requiredQuests.add(opt.questSlug);
              }
            }
          };
          if (dialogueTree.nodes) {
            Object.values(dialogueTree.nodes).forEach(scanDialogue);
          }
        } catch (e) {}
      }

      // Scan NPC shop inventory for items
      if (parsedComponents.capabilities?.shopkeeper && parsedComponents.capabilities?.shopInventory) {
        try {
          for (const item of parsedComponents.capabilities.shopInventory) {
            if (item.slug) ctx.requiredItems.add(item.slug);
          }
        } catch(e) {}
      }

      ctx.manifest.actors.npcs.push({
        slug: npcDef.slug,
        name: npcDef.name,
        worldModel: parsedComponents.appearance?.templateId || parsedComponents.appearance?.spriteId || 'unknown',
        dialogueTree,
        capabilities: parsedComponents.capabilities || {}
      });
    }
  }

  // 2. Resolve Monsters & Creatures
  const resolvedCreatures = new Set([
    ...ctx.manifest.actors.monsters.map((c: any) => c.slug),
    ...ctx.manifest.actors.creatures.map((c: any) => c.slug)
  ]);
  const pendingCreatures = new Set(
    [...Array.from(ctx.requiredMonsters), ...Array.from(ctx.requiredCreatures)]
      .filter(slug => !resolvedCreatures.has(slug))
  );
  
  if (pendingCreatures.size > 0) {
    const creatures = await prisma.creatureDef.findMany({ 
      where: { slug: { in: Array.from(pendingCreatures) } } 
    });

    for (const slug of pendingCreatures) {
      const c = creatures.find(cr => cr.slug === slug);
      if (!c) {
        ctx.errors.push(`Missing CreatureDef for slug '${slug}'`);
        continue;
      }
      
      try {
        const abilities = JSON.parse(c.abilitiesJson || '[]');
        for (const ab of abilities) {
          if (ab.abilitySlug) ctx.requiredAbilities.add(ab.abilitySlug);
        }
      } catch(e) {}
      
      try {
        const evolutions = JSON.parse(c.evolutionsJson || '[]');
        for (const ev of evolutions) {
          if (ev.targetSlug) {
            // Need to fetch this evolution recursively, so we push it to requirements.
            // Since we are not doing a full while loop here, the Orchestrator will need to loop the resolvers.
            if (!ctx.requiredCreatures.has(ev.targetSlug) && !ctx.requiredMonsters.has(ev.targetSlug)) {
              ctx.requiredCreatures.add(ev.targetSlug);
            }
          }
        }
      } catch(e) {}
      
      if (c.isWildSpawn) {
        ctx.manifest.actors.monsters.push(c);
      } else {
        ctx.manifest.actors.creatures.push(c);
      }
    }
  }
}
