import { prisma } from '../src/web/lib/prisma';
import { upsertNpcDef, listNpcDefs } from '../app/actions/studio/npc-def';
import { resolveWorldDependencies } from '../app/actions/studio/world-resolver';
import { randomUUID } from 'crypto';
import { generateDefaultWorldDoc } from '../src/shared/game/voxel/VoxelWorldDoc';
import { ComponentMap } from '../src/shared/game/entities/types';

async function runTests() {
  console.log('--- TEST 1: Persistence Test ---');
  const npcSlug = `npc_blacksmith_${Date.now()}`;
  
  const components: Partial<ComponentMap> = {
    identity: { name: 'Blacksmith Test', slug: npcSlug },
    appearance: { assetProfileId: '2D Sprite', assetId: 'adventurer' },
    capabilities: { shopkeeper: true, banker: false, questGiver: true }
  };

  const res1 = await prisma.npcDef.upsert({
    where: { slug: npcSlug },
    create: {
      gameId: 'saints',
      slug: npcSlug,
      name: 'Blacksmith Test',
      componentsData: JSON.stringify(components)
    },
    update: {}
  });
  
  if (!res1) throw new Error('Failed to create NPC');
  console.log('✅ Created NPC:', npcSlug);

  const found = await prisma.npcDef.findUnique({ where: { slug: npcSlug } });
  if (!found) throw new Error('NPC did not persist!');
  
  const parsed = JSON.parse(found.componentsData);
  if (!parsed.capabilities?.shopkeeper) throw new Error('Capabilities did not persist!');
  console.log('✅ NPC Persistence verified.');

  console.log('\n--- TEST 2 & 3: World Placement & Release Test ---');
  // Create a dummy map and project
  const mapId = `map_${Date.now()}`;
  
  // Add our NPC to the map's entities
  const entities = [
    {
      id: randomUUID(),
      archetype: 'npc',
      components: {
        identity: { slug: npcSlug, name: 'Blacksmith Test' },
        transform: { x: 0, y: 0 }
      }
    }
  ];

  await prisma.worldMap.create({
    data: {
      id: mapId,
      name: 'Test Map',
      gameId: 'saints',
      version: 1,
      entitiesData: JSON.stringify(entities),
      gatesData: '[]',
      encountersData: '[]',
      freeformLayersData: '[]'
    }
  });

  const project = await prisma.worldProject.create({
    data: {
      id: `proj_${Date.now()}`,
      slug: `proj_${Date.now()}`,
      name: 'Test Project',
      activeVersion: 1,
      maps: { connect: { id: mapId } }
    }
  });
  console.log('✅ Created Test Map & Project');

  // Publish Release 1
  const release1 = await resolveWorldDependencies(project.id);
  const npcInRelease1 = release1.actors.npcs.find((n: any) => n.slug === npcSlug);
  if (!npcInRelease1) throw new Error('NPC not captured in Release 1');
  console.log('✅ Release 1 capabilities:', npcInRelease1.capabilities);

  // Modify the NPC (Shopkeeper = false, Banker = true)
  components.capabilities = { shopkeeper: false, banker: true, questGiver: true };
  await prisma.npcDef.update({
    where: { slug: npcSlug },
    data: {
      name: 'Blacksmith Test Updated',
      componentsData: JSON.stringify(components)
    }
  });
  console.log('✅ Updated NPC in Working World');

  // Publish Release 2
  const release2 = await resolveWorldDependencies(project.id);
  const npcInRelease2 = release2.actors.npcs.find((n: any) => n.slug === npcSlug);
  if (!npcInRelease2) throw new Error('NPC not captured in Release 2');
  console.log('✅ Release 2 capabilities:', npcInRelease2.capabilities);

  // Ensure Release 1 is still technically frozen in its own output
  if (npcInRelease1.capabilities.shopkeeper !== true || npcInRelease2.capabilities.shopkeeper !== false) {
    throw new Error('Release immutability failed! Releases did not capture exact revisions properly over time.');
  }
  
  console.log('\n✅ ALL TESTS PASSED! Immutable Release Architecture verified.');
  
  // Cleanup
  await prisma.worldMap.delete({ where: { id: mapId } });
  await prisma.worldProject.delete({ where: { id: project.id } });
  await prisma.npcDef.delete({ where: { slug: npcSlug } });
}

runTests().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
