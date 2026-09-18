import { prisma } from '../src/web/lib/prisma';
import { resolveWorldDependencies } from '../app/actions/studio/world-resolver';
import { randomUUID } from 'crypto';

async function runTests() {
  console.log('--- TEST: Strict Dependency Graph Resolution ---');

  const uniqueId = Date.now();
  
  // 1. Create a dummy item that WILL be used
  const usedItemSlug = `item_potion_${uniqueId}`;
  await prisma.itemTemplate.create({
    data: {
      slug: usedItemSlug,
      name: 'Used Potion',
      description: 'Used in test',
      category: 'CONSUMABLE',
      subCategory: 'POTION',
      tier: 1,
      stackable: true
    }
  });

  // 2. Create a dummy item that will NOT be used (Global unused item)
  const unusedItemSlug = `item_sword_${uniqueId}`;
  await prisma.itemTemplate.create({
    data: {
      slug: unusedItemSlug,
      name: 'Unused Sword',
      description: 'Should not appear in manifest',
      category: 'WEAPON',
      subCategory: 'SWORD',
      tier: 2,
      stackable: false
    }
  });

  // 3. Create a Quest that rewards the used item
  const questSlug = `quest_test_${uniqueId}`;
  await prisma.questTemplate.create({
    data: {
      slug: questSlug,
      title: 'Test Quest',
      description: 'Reward gives a potion',
      rewards: JSON.stringify([{ type: 'ITEM', itemSlug: usedItemSlug, quantity: 1 }])
    }
  });

  // 4. Create an NPC whose dialogue triggers the quest
  const npcSlug = `npc_questgiver_${uniqueId}`;
  const dialogueData = {
    nodes: {
      root: {
        speaker: 'Test NPC',
        text: 'Hello',
        choices: [
          { label: 'Accept', action: 'accept_quest', questSlug: questSlug }
        ]
      }
    }
  };

  await prisma.npcDef.create({
    data: {
      projectId: 'saints',
      slug: npcSlug,
      name: 'Quest Giver',
      componentsData: JSON.stringify({ behavior: { dialogueId: npcSlug } })
    }
  });

  await prisma.npcDialogueTree.create({
    data: {
      npcId: npcSlug,
      name: 'Test Dialogue',
      data: JSON.stringify(dialogueData)
    }
  });

  // 5. Create a Map with the NPC
  const mapId = `map_${uniqueId}`;
  const entities = [
    {
      id: randomUUID(),
      archetype: 'npc',
      components: {
        identity: { slug: npcSlug, name: 'Quest Giver' },
        transform: { x: 0, y: 0 }
      }
    }
  ];

  await prisma.worldMap.create({
    data: {
      id: mapId,
      name: 'Dependency Test Map',
      projectId: 'saints',
      version: 1,
      entitiesData: JSON.stringify(entities),
      gatesData: '[]',
      encountersData: '[]',
      freeformLayersData: '[]'
    }
  });

  const project = await prisma.worldProject.create({
    data: {
      id: `proj_${uniqueId}`,
      slug: `proj_${uniqueId}`,
      name: 'Test Project',
      activeVersion: 1,
      maps: { connect: { id: mapId } }
    }
  });
  console.log('✅ Created Sandbox Data');

  // 6. Compile and Verify
  const release = await resolveWorldDependencies(project.id);
  
  const hasUsedItem = release.items.some(i => i.slug === usedItemSlug);
  const hasUnusedItem = release.items.some(i => i.slug === unusedItemSlug);
  const hasQuest = release.gameplay.quests.some(q => q.slug === questSlug);
  
  console.log('✅ Compiled Release');
  
  if (!hasQuest) throw new Error('Quest was not compiled from NPC dialogue dependency!');
  if (!hasUsedItem) throw new Error('Item was not compiled from Quest reward dependency!');
  if (hasUnusedItem) throw new Error('Unused item leaked into the compiled release!');
  
  console.log('✅ Transitive Dependency Graph Verified: NPC -> Dialogue -> Quest -> Item');
  console.log('✅ Global State Isolation Verified: Unused item excluded.');

  // 7. Test Missing Dependency Failure
  // Delete the item, then try to publish again. It should fail and not leave a corrupted release.
  await prisma.itemTemplate.delete({ where: { slug: usedItemSlug } });
  let failedAsExpected = false;
  try {
    await resolveWorldDependencies(project.id);
  } catch (e: any) {
    if (e.message.includes('Missing Item slug')) {
      failedAsExpected = true;
    }
  }

  if (!failedAsExpected) {
    throw new Error('Graph Validation Error was not thrown when a required transitive dependency was missing!');
  }
  
  console.log('✅ Missing Dependency Failure Verified');

  // Cleanup
  await prisma.worldMap.delete({ where: { id: mapId } });
  await prisma.worldProject.delete({ where: { id: project.id } });
  await prisma.npcDialogueTree.delete({ where: { npcId: npcSlug } });
  await prisma.npcDef.delete({ where: { slug: npcSlug } });
  await prisma.questTemplate.delete({ where: { slug: questSlug } });
  await prisma.itemTemplate.delete({ where: { slug: unusedItemSlug } });
  
  console.log('\n✅ ALL DEPENDENCY TESTS PASSED!');
}

runTests().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
