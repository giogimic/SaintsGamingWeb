import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export interface ValidationReport {
  totalMaps: number;
  validMaps: number;
  invalidMaps: number;
  wallpaperMaps: number;
  issues: Array<{ mapId: string; type: 'EMPTY_LAYERS' | 'MISSING_TILESET' | 'INVALID_GATE' | 'ORPHAN_TILE'; detail: string }>;
}

async function validateMaps(): Promise<ValidationReport> {
  console.log('Validating WorldMap database entries...');

  const maps = await prisma.worldMap.findMany();
  const tilesetsDir = path.join(process.cwd(), 'public', 'tuxemon-assets', 'tilesets');

  const report: ValidationReport = {
    totalMaps: maps.length,
    validMaps: 0,
    invalidMaps: 0,
    wallpaperMaps: 0,
    issues: [],
  };

  for (const map of maps) {
    let hasIssue = false;
    const tileLayers = JSON.parse(map.tileLayersData || '[]');
    const tilesets = JSON.parse(map.tilesetsData || '[]');
    const gates = JSON.parse(map.gatesData || '{}');

    // 1. Check tileLayers and tilesets
    if (!tileLayers || tileLayers.length === 0 || !tilesets || tilesets.length === 0) {
      report.wallpaperMaps++;
      report.issues.push({
        mapId: map.id,
        type: 'EMPTY_LAYERS',
        detail: 'Map has empty tileLayers or tilesets array (falls back to colored squares).',
      });
      hasIssue = true;
    }

    // 2. Check tileset image source files
    if (tilesets && tilesets.length > 0) {
      for (const ts of tilesets) {
        if (ts.imageSource) {
          const fileExist = fs.existsSync(path.join(tilesetsDir, ts.imageSource));
          if (!fileExist) {
            report.issues.push({
              mapId: map.id,
              type: 'MISSING_TILESET',
              detail: `Tileset image missing at /tuxemon-assets/tilesets/${ts.imageSource}`,
            });
            hasIssue = true;
          }
        }
      }
    }

    // 3. Check gate targets
    if (gates) {
      for (const [gateKey, gate] of Object.entries(gates as Record<string, any>)) {
        if (gate.targetMapId) {
          const targetExists = maps.some((m) => m.id === gate.targetMapId);
          if (!targetExists) {
            report.issues.push({
              mapId: map.id,
              type: 'INVALID_GATE',
              detail: `Gate key ${gateKey} points to non-existent map '${gate.targetMapId}'`,
            });
            hasIssue = true;
          }
        }
      }
    }

    if (!hasIssue) {
      report.validMaps++;
    } else {
      report.invalidMaps++;
    }
  }

  console.log('=== MAP VALIDATION REPORT ===');
  console.log(`Total Maps: ${report.totalMaps}`);
  console.log(`Valid Maps: ${report.validMaps}`);
  console.log(`Invalid/Issue Maps: ${report.invalidMaps}`);
  console.log(`Wallpaper Fallback Maps: ${report.wallpaperMaps}`);
  console.log(`Total Issues Found: ${report.issues.length}`);

  return report;
}

validateMaps()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
