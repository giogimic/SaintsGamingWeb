import { resolveWorldDependencies } from '../app/actions/studio/world-resolver';
import { prisma } from '../src/web/lib/prisma';

async function main() {
  console.log('--- Starting World Connections Validation Test ---');
  
  // 1. Create a dummy project
  const project = await prisma.worldProject.create({
    data: {
      slug: 'test-phase-3c',
      name: 'Test Project Phase 3C',
      description: 'Testing connections validation',
    }
  });

  // 2. Create map A (Valid Entry point)
  const mapA = await prisma.worldMap.create({
    data: {
      id: 'map_a_test',
      projectId: project.slug,
      name: 'Map A',
      mapType: 'TILE',
      gridData: '[[]]',
      gatesData: '[]',
      entitiesData: JSON.stringify([
        {
          id: 'gate_1',
          archetype: 'warp',
          components: {
            warp: { targetMapId: 'map_b_test', targetEntryPointId: 'default' }
          }
        }
      ])
    }
  });

  // 3. Create map B (Missing the required entry point name)
  const mapB = await prisma.worldMap.create({
    data: {
      id: 'map_b_test',
      projectId: project.slug,
      name: 'Map B',
      mapType: 'TILE',
      gridData: '[[]]',
      gatesData: '[]',
      entitiesData: JSON.stringify([
        {
          id: 'gate_2',
          archetype: 'warp',
          components: {
            warp: { targetMapId: mapA.id, targetEntryPointId: 'non_existent_entry_point' }
          }
        }
      ])
    }
  });

  // Re-link map A to point to map B's actual ID
  await prisma.worldMap.update({
    where: { id: mapA.id },
    data: {
      entitiesData: JSON.stringify([
        {
          id: 'gate_1',
          archetype: 'warp',
          components: {
            warp: { targetMapId: mapB.id, targetEntryPointId: 'default' } // Map B always implicitly has 'default'
          }
        }
      ])
    }
  });

  try {
    // 4. Test compilation. This should FAIL because map B's gate_2 points to 'non_existent_entry_point' on map A.
    console.log('Compiling project...');
    await resolveWorldDependencies(project.id);
    console.error('❌ TEST FAILED: Compilation succeeded but it should have failed due to invalid entry point.');
    process.exit(1);
  } catch (err: any) {
    if (err.message.includes('points to invalid Entry Point')) {
      console.log('✅ TEST PASSED: Compiler correctly caught invalid Entry Point.');
      console.log('   Error:', err.message);
    } else {
      console.error('❌ TEST FAILED: Compiler threw unexpected error:', err.message);
      process.exit(1);
    }
  }

  // Cleanup
  await prisma.worldMap.deleteMany({ where: { projectId: project.slug } });
  await prisma.worldProject.delete({ where: { id: project.id } });
}

main().catch(console.error);
