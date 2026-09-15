import re

with open('app/actions/studio/map-npcs.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Update placeMapNpc to upsert NpcDef instead of NpcDialogueTree directly
# Wait, NpcDialogueTree should still be created if greeting/questSlug is provided, but linked to NpcDef's slug instead of map instance id.

# Replace dialogue tree creation in placeMapNpc
dialogue_pattern_place = r"const tree = defaultDialogueTree\(opts\.name, opts\.greeting \|\| '', opts\.questSlug\);\s*await prisma\.npcDialogueTree\.upsert\(\{\s*where: \{ npcId: id \},\s*create: \{\s*npcId: id,\s*name: opts\.name,\s*data: JSON\.stringify\(tree\),\s*\},\s*update: \{\s*name: opts\.name,\s*data: JSON\.stringify\(tree\),\s*\},\s*\}\);"

new_dialogue_place = """
    // Create or update NpcDef
    const defComponents = {
      identity: { name: opts.name, slug: base },
      appearance: { assetProfileId: sprite },
      dialogue: opts.greeting ? { dialogueKey: opts.greeting } : undefined,
    };
    
    await prisma.npcDef.upsert({
      where: { slug: base },
      create: {
        slug: base,
        name: opts.name,
        componentsData: JSON.stringify(defComponents)
      },
      update: {
        // We only update if we want placing a new instance to overwrite the definition
        // For now, let's just make sure it exists
      }
    });

    const tree = defaultDialogueTree(opts.name, opts.greeting || '', opts.questSlug);
    await prisma.npcDialogueTree.upsert({
      where: { npcId: base },
      create: {
        npcId: base,
        name: opts.name,
        data: JSON.stringify(tree),
      },
      update: {
        name: opts.name,
        data: JSON.stringify(tree),
      },
    });
"""

code = re.sub(dialogue_pattern_place, new_dialogue_place, code)

# Fix cache invalidation
code = code.replace("invalidateDialogueCache(id);", "invalidateDialogueCache(base);")

# Update updateMapNpc
dialogue_pattern_update = r"const tree = defaultDialogueTree\([\s\S]*?\);\s*await prisma\.npcDialogueTree\.upsert\(\{\s*where: \{ npcId \},\s*create: \{ npcId, name: next\.components\?\.identity\?\.name \|\| \"Unknown\", data: JSON\.stringify\(tree\) \},\s*update: \{ name: next\.components\?\.identity\?\.name \|\| \"Unknown\", data: JSON\.stringify\(tree\) \},\s*\}\);"

new_dialogue_update = """
      const defSlug = next.components?.identity?.slug || 'unknown';
      const tree = defaultDialogueTree(
        next.components?.identity?.name || "Unknown",
        opts.greeting ?? next.components?.dialogue?.dialogueKey ?? '',
        opts.questSlug
      );
      
      const defComponents = {
        identity: { name: next.components?.identity?.name || "Unknown", slug: defSlug },
        appearance: { assetProfileId: sprite },
        dialogue: opts.greeting ? { dialogueKey: opts.greeting } : undefined,
      };

      await prisma.npcDef.upsert({
        where: { slug: defSlug },
        create: {
          slug: defSlug,
          name: next.components?.identity?.name || "Unknown",
          componentsData: JSON.stringify(defComponents)
        },
        update: {
          name: next.components?.identity?.name || "Unknown",
          componentsData: JSON.stringify(defComponents)
        }
      });

      await prisma.npcDialogueTree.upsert({
        where: { npcId: defSlug },
        create: { npcId: defSlug, name: next.components?.identity?.name || "Unknown", data: JSON.stringify(tree) },
        update: { name: next.components?.identity?.name || "Unknown", data: JSON.stringify(tree) },
      });
"""

code = re.sub(dialogue_pattern_update, new_dialogue_update, code)
code = code.replace("invalidateDialogueCache(npcId);", "invalidateDialogueCache(next.components?.identity?.slug || 'unknown');")

# In deleteMapNpc, we do NOT delete NpcDef or NpcDialogueTree, because it's just removing an instance!
code = code.replace("await prisma.npcDialogueTree.delete({ where: { npcId } }).catch(() => {});\n      invalidateDialogueCache(npcId);", "/* We no longer delete dialogue trees when deleting an instance, as they belong to the NpcDef */")

with open('app/actions/studio/map-npcs.ts', 'w', encoding='utf-8') as f:
    f.write(code)
