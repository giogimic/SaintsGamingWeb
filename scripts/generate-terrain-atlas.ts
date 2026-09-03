import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const ATLAS_SIZE = 1024;
const CELL_SIZE = 256;
const COLS = 4;
const ROWS = 4;

// Periodic 2D value noise for seamless wrap-around on [0, CELL_SIZE)
function periodicNoise(x: number, y: number, freq: number, seed: number = 0): number {
  const ax = (x / CELL_SIZE) * Math.PI * 2 * freq;
  const ay = (y / CELL_SIZE) * Math.PI * 2 * freq;
  
  // 4D periodic projection (torus)
  const nx = Math.cos(ax) + Math.cos(seed * 1.7);
  const ny = Math.sin(ax) + Math.sin(seed * 2.3);
  const nz = Math.cos(ay) + Math.cos(seed * 3.1);
  const nw = Math.sin(ay) + Math.sin(seed * 4.7);
  
  const v1 = Math.sin(nx * 2.1 + nz * 1.7 + seed);
  const v2 = Math.cos(ny * 1.9 + nw * 2.3 + seed * 1.3);
  const v3 = Math.sin((nx + nw) * 1.5 + (ny - nz) * 1.2);
  
  return (v1 * 0.4 + v2 * 0.4 + v3 * 0.2 + 1) * 0.5; // normalized 0..1
}

function fbm(x: number, y: number, octaves: number = 4, seed: number = 0): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  let sumAmp = 0;
  for (let i = 0; i < octaves; i++) {
    val += periodicNoise(x, y, freq, seed + i * 17.13) * amp;
    sumAmp += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return val / sumAmp;
}

function clamp(v: number, min: number = 0, max: number = 255): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function lerpColor(c1: [number, number, number], c2: [number, number, number], t: number): [number, number, number] {
  const ct = Math.max(0, Math.min(1, t));
  return [
    c1[0] + (c2[0] - c1[0]) * ct,
    c1[1] + (c2[1] - c1[1]) * ct,
    c1[2] + (c2[2] - c1[2]) * ct,
  ];
}

type GeneratorFn = (lx: number, ly: number) => [number, number, number, number];

// 1. Gunmetal Base Foundation (Col 0, Row 0) — sleek dark stone / alloy without scanlines
const genGunmetal: GeneratorFn = (x, y) => {
  const n = fbm(x, y, 4, 101);
  const grain = periodicNoise(x, y, 20, 102);
  const base: [number, number, number] = [36, 42, 51];
  const dark: [number, number, number] = [28, 33, 40];
  const light: [number, number, number] = [46, 54, 64];
  const col = n < 0.5 ? lerpColor(dark, base, n * 2) : lerpColor(base, light, (n - 0.5) * 2);
  
  // Clean subtle isotropic noise grain (no directional stripes)
  const speckle = (grain - 0.5) * 4;
  return [clamp(col[0] + speckle), clamp(col[1] + speckle), clamp(col[2] + speckle), 255];
};

// 2. Golden Desert Sand (Col 1, Row 0)
const genSand: GeneratorFn = (x, y) => {
  const n = fbm(x, y, 4, 202);
  // Gentle periodic wind dune ripples
  const dune = Math.sin((x / 256) * Math.PI * 8 + (y / 256) * Math.PI * 4 + n * 2) * 0.5 + 0.5;
  const darkSand: [number, number, number] = [196, 147, 52];
  const midSand: [number, number, number] = [218, 168, 64];
  const brightSand: [number, number, number] = [238, 192, 85];
  const col = lerpColor(darkSand, midSand, n * 0.7 + dune * 0.3);
  const finalCol = dune > 0.7 ? lerpColor(col, brightSand, (dune - 0.7) * 2) : col;
  return [clamp(finalCol[0]), clamp(finalCol[1]), clamp(finalCol[2]), 255];
};

// 3. Crystal River Water (Col 2, Row 0)
const genWater: GeneratorFn = (x, y) => {
  const n1 = fbm(x, y, 3, 303);
  const n2 = fbm(x + 64, y + 64, 4, 304);
  // Caustics wave pattern
  const caustic = Math.abs(Math.sin(n1 * Math.PI * 3 + n2 * Math.PI * 2));
  const deepBlue: [number, number, number] = [22, 105, 175];
  const azure: [number, number, number] = [41, 144, 219];
  const causticBright: [number, number, number] = [88, 195, 248];
  
  const col = lerpColor(deepBlue, azure, n1);
  const finalCol = caustic > 0.65 ? lerpColor(col, causticBright, (caustic - 0.65) * 2.5) : col;
  return [clamp(finalCol[0]), clamp(finalCol[1]), clamp(finalCol[2]), 230];
};

// 4. Village Cobblestone / Stone (Col 3, Row 0)
const genStone: GeneratorFn = (x, y) => {
  const n = fbm(x, y, 4, 404);
  // Organic rounded cobblestone shapes
  const cx = Math.sin((x / 256) * Math.PI * 12);
  const cy = Math.sin((y / 256) * Math.PI * 12);
  const stoneBorder = Math.abs(cx * cy);
  
  const mortar: [number, number, number] = [88, 96, 108];
  const stoneBody: [number, number, number] = [112, 122, 138];
  const stoneHighlight: [number, number, number] = [138, 150, 168];
  
  let col = lerpColor(mortar, stoneBody, Math.min(1, stoneBorder * 2.5));
  if (n > 0.6) {
    col = lerpColor(col, stoneHighlight, (n - 0.6) * 1.5);
  }
  return [clamp(col[0]), clamp(col[1]), clamp(col[2]), 255];
};

// 5. Lush Meadow Grass (Col 0, Row 1) — ZERO BLACK EDGES, 100% CONNECTING
const genGrass: GeneratorFn = (x, y) => {
  const n = fbm(x, y, 5, 505);
  const deepGrass: [number, number, number] = [38, 105, 28];
  const meadowGreen: [number, number, number] = [52, 148, 38];
  const lushHighlight: [number, number, number] = [76, 196, 56];
  
  // Subtle blade speckles
  const bladeNoise = periodicNoise(x, y, 16, 506);
  let col = lerpColor(deepGrass, meadowGreen, n);
  if (bladeNoise > 0.62) {
    col = lerpColor(col, lushHighlight, (bladeNoise - 0.62) * 2);
  }
  return [clamp(col[0]), clamp(col[1]), clamp(col[2]), 255];
};

// 6. Rich Loam Soil / Dirt (Col 1, Row 1)
const genDirt: GeneratorFn = (x, y) => {
  const n = fbm(x, y, 5, 606);
  const deepDirt: [number, number, number] = [82, 54, 28];
  const loamBrown: [number, number, number] = [110, 75, 40];
  const warmHighlight: [number, number, number] = [138, 96, 52];
  
  const pebbleNoise = periodicNoise(x, y, 24, 607);
  let col = lerpColor(deepDirt, loamBrown, n);
  if (pebbleNoise > 0.78) {
    col = lerpColor(col, warmHighlight, (pebbleNoise - 0.78) * 3);
  }
  return [clamp(col[0]), clamp(col[1]), clamp(col[2]), 255];
};

// 7. Polished Oak Wood (Col 2, Row 1) — warm natural wood grain without harsh scanlines
const genWood: GeneratorFn = (x, y) => {
  // Continuous organic wood grain using stretch-ratio FBM
  const grainNoise = fbm(x * 0.3, y * 2.5, 4, 707);
  const ringNoise = periodicNoise(x * 0.5, y * 0.1, 16, 708);
  const n = (grainNoise * 0.7 + ringNoise * 0.3);

  const deepWood: [number, number, number] = [118, 74, 34];
  const warmWood: [number, number, number] = [142, 92, 44];
  const lightWood: [number, number, number] = [168, 114, 58];

  let col = n < 0.5 ? lerpColor(deepWood, warmWood, n * 2) : lerpColor(warmWood, lightWood, (n - 0.5) * 2);
  
  // Subtle organic grain variation (smooth and non-intrusive)
  const fineGrain = periodicNoise(x * 2, y * 0.5, 24, 709);
  if (fineGrain > 0.75) {
    col = lerpColor(col, deepWood, (fineGrain - 0.75) * 0.8);
  }

  return [clamp(col[0]), clamp(col[1]), clamp(col[2]), 255];
};

// 8. Alpine Powder Snow (Col 3, Row 1)
const genSnow: GeneratorFn = (x, y) => {
  const n = fbm(x, y, 4, 808);
  const shadowSnow: [number, number, number] = [214, 226, 238];
  const pureWhite: [number, number, number] = [242, 248, 254];
  const glintSnow: [number, number, number] = [255, 255, 255];
  
  const sparkle = periodicNoise(x, y, 32, 809);
  let col = lerpColor(shadowSnow, pureWhite, n);
  if (sparkle > 0.85) col = glintSnow;
  
  return [clamp(col[0]), clamp(col[1]), clamp(col[2]), 255];
};

// 9. Molten Magma Flow / Lava (Col 0, Row 2)
const genLava: GeneratorFn = (x, y) => {
  const n1 = fbm(x, y, 4, 909);
  const n2 = fbm(x + 32, y + 32, 5, 910);
  const crust = Math.abs(n1 - 0.5) * 2;
  
  const darkCrust: [number, number, number] = [78, 24, 12];
  const redFire: [number, number, number] = [218, 56, 14];
  const brightOrange: [number, number, number] = [248, 128, 26];
  const coreYellow: [number, number, number] = [255, 214, 64];
  
  let col: [number, number, number];
  if (n2 > 0.72) {
    col = lerpColor(brightOrange, coreYellow, (n2 - 0.72) * 3);
  } else if (crust > 0.45) {
    col = lerpColor(redFire, darkCrust, (crust - 0.45) * 1.8);
  } else {
    col = lerpColor(brightOrange, redFire, crust * 2.2);
  }
  return [clamp(col[0]), clamp(col[1]), clamp(col[2]), 255];
};

// 10. Dark Murky Marsh / Swamp (Col 1, Row 2)
const genSwamp: GeneratorFn = (x, y) => {
  const n = fbm(x, y, 4, 1010);
  const mossNoise = periodicNoise(x, y, 8, 1011);
  const deepPeat: [number, number, number] = [48, 58, 24];
  const oliveMoss: [number, number, number] = [72, 92, 36];
  const murkyWater: [number, number, number] = [38, 48, 28];
  
  let col = lerpColor(deepPeat, oliveMoss, n);
  if (mossNoise < 0.35) {
    col = lerpColor(murkyWater, col, mossNoise * 2.5);
  }
  return [clamp(col[0]), clamp(col[1]), clamp(col[2]), 255];
};

// 11. Ancient Flagstone / Dungeon (Col 2, Row 2)
const genDungeon: GeneratorFn = (x, y) => {
  // Classic staggered masonry flagstones
  const row = Math.floor((y / 256) * 4);
  const xOffset = (row % 2) * 32;
  const colIdx = Math.floor(((x + xOffset) % 256) / 64);
  const n = fbm(x, y, 4, 1111 + row * 7 + colIdx);
  
  const stoneEdgeX = ((x + xOffset) % 64);
  const stoneEdgeY = (y % 64);
  const isMortar = stoneEdgeX < 3 || stoneEdgeX > 61 || stoneEdgeY < 3 || stoneEdgeY > 61;
  
  const mortarColor: [number, number, number] = [44, 48, 58];
  const dungeonStone: [number, number, number] = [72, 80, 96];
  const stoneLight: [number, number, number] = [96, 106, 124];
  
  let col = isMortar ? mortarColor : lerpColor(dungeonStone, stoneLight, n);
  return [clamp(col[0]), clamp(col[1]), clamp(col[2]), 255];
};

// 12. Glacial Blue Ice (Col 3, Row 2)
const genIce: GeneratorFn = (x, y) => {
  const n = fbm(x, y, 4, 1212);
  const fracture = Math.abs(Math.sin((x / 256) * Math.PI * 6 + (y / 256) * Math.PI * 6 + n * 3));
  
  const deepIce: [number, number, number] = [62, 172, 208];
  const azureIce: [number, number, number] = [98, 212, 240];
  const frostWhite: [number, number, number] = [188, 244, 255];
  
  let col = lerpColor(deepIce, azureIce, n);
  if (fracture > 0.82) {
    col = lerpColor(col, frostWhite, (fracture - 0.82) * 4);
  }
  return [clamp(col[0]), clamp(col[1]), clamp(col[2]), 240];
};

// 13. Grass Block Side Profile (Col 0, Row 3)
const genGrassSide: GeneratorFn = (x, y) => {
  const fringeHeight = 64 + Math.sin((x / 256) * Math.PI * 16) * 12 + periodicNoise(x, y, 8, 1313) * 16;
  if (y < fringeHeight) {
    return genGrass(x, y);
  } else {
    return genDirt(x, y);
  }
};

// 14. Snow Block Side Profile (Col 1, Row 3)
const genSnowSide: GeneratorFn = (x, y) => {
  const capHeight = 56 + Math.sin((x / 256) * Math.PI * 12) * 10 + periodicNoise(x, y, 8, 1414) * 12;
  if (y < capHeight) {
    return genSnow(x, y);
  } else {
    return genStone(x, y);
  }
};

// 15. Desert Sandstone Cliff (Col 2, Row 3)
const genSandstone: GeneratorFn = (x, y) => {
  const n = fbm(x, y, 4, 1515);
  const strata = Math.sin((y / 256) * Math.PI * 16 + n * 2);
  
  const darkStrata: [number, number, number] = [178, 132, 54];
  const midStrata: [number, number, number] = [204, 156, 68];
  const lightStrata: [number, number, number] = [228, 180, 84];
  
  let col = strata < 0 ? lerpColor(darkStrata, midStrata, strata + 1) : lerpColor(midStrata, lightStrata, strata);
  return [clamp(col[0]), clamp(col[1]), clamp(col[2]), 255];
};

// 16. Dark Volcanic Slate / Obsidian (Col 3, Row 3)
const genObsidian: GeneratorFn = (x, y) => {
  const n = fbm(x, y, 4, 1616);
  const glass = periodicNoise(x, y, 12, 1617);
  
  const deepBlack: [number, number, number] = [20, 22, 28];
  const slateDark: [number, number, number] = [32, 36, 46];
  const purpleSheen: [number, number, number] = [48, 42, 62];
  
  let col = lerpColor(deepBlack, slateDark, n);
  if (glass > 0.75) {
    col = lerpColor(col, purpleSheen, (glass - 0.75) * 3);
  }
  return [clamp(col[0]), clamp(col[1]), clamp(col[2]), 255];
};

const GRID_GENERATORS: GeneratorFn[][] = [
  // Row 0
  [genGunmetal, genSand, genWater, genStone],
  // Row 1
  [genGrass, genDirt, genWood, genSnow],
  // Row 2
  [genLava, genSwamp, genDungeon, genIce],
  // Row 3
  [genGrassSide, genSnowSide, genSandstone, genObsidian],
];

export async function generateTerrainAtlas(): Promise<void> {
  const buffer = Buffer.alloc(ATLAS_SIZE * ATLAS_SIZE * 4);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const generator = GRID_GENERATORS[row][col];
      const startX = col * CELL_SIZE;
      const startY = row * CELL_SIZE;

      for (let ly = 0; ly < CELL_SIZE; ly++) {
        for (let lx = 0; lx < CELL_SIZE; lx++) {
          const [r, g, b, a] = generator(lx, ly);
          const px = startX + lx;
          const py = startY + ly;
          const idx = (py * ATLAS_SIZE + px) * 4;

          buffer[idx + 0] = r;
          buffer[idx + 1] = g;
          buffer[idx + 2] = b;
          buffer[idx + 3] = a;
        }
      }
    }
  }

  const outputPath = path.join(process.cwd(), 'public', 'game-assets', 'tilesets', 'terrain-overworld.png');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  await sharp(buffer, {
    raw: {
      width: ATLAS_SIZE,
      height: ATLAS_SIZE,
      channels: 4,
    },
  })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  console.log(`[generate-terrain-atlas] Successfully written seamless 1024x1024 PNG atlas to ${outputPath}`);
}

// Auto-run when executed directly via tsx
generateTerrainAtlas().catch((err) => {
  console.error('[generate-terrain-atlas] Error generating atlas:', err);
  process.exit(1);
});
