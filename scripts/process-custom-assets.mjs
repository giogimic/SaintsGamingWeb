#!/usr/bin/env node
/**
 * Convert custom Saints assets that were saved as JPEG bytes under .png names
 * into real PNGs with keyed alpha, and extract overworld crops from composite sheets.
 *
 * Why: Next serves Content-Type image/png + X-Content-Type-Options: nosniff,
 * so browsers refuse to decode JPEG bodies labeled as PNG.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = process.cwd();
const CUSTOM_NPCS = [
  "candrift_keeper",
  "capturer_kian",
  "elder_voss",
  "ironwright_kael",
  "scout_mira",
  "soulwarden_aldric",
];

function colorDist(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function samplePatch(data, w, h, x0, y0, size = 12) {
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (let y = y0; y < Math.min(h, y0 + size); y++) {
    for (let x = x0; x < Math.min(w, x0 + size); x++) {
      const i = (y * w + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
  }
  return [r / n, g / n, b / n];
}

/** Key out near-corner background colors → alpha 0. */
function keyBackground(data, w, h, threshold = 42) {
  const corners = [
    samplePatch(data, w, h, 0, 0),
    samplePatch(data, w, h, w - 12, 0),
    samplePatch(data, w, h, 0, h - 12),
    samplePatch(data, w, h, w - 12, h - 12),
  ];
  // median-ish: average of the two closest corner pairs
  const bg = [
    (corners[0][0] + corners[1][0] + corners[2][0] + corners[3][0]) / 4,
    (corners[0][1] + corners[1][1] + corners[2][1] + corners[3][1]) / 4,
    (corners[0][2] + corners[1][2] + corners[2][2] + corners[3][2]) / 4,
  ];

  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    const d = colorDist([out[i], out[i + 1], out[i + 2]], bg);
    if (d < threshold) {
      out[i + 3] = 0;
    } else if (d < threshold + 18) {
      // soft edge
      out[i + 3] = Math.min(out[i + 3], Math.round(((d - threshold) / 18) * 255));
    }
  }

  // Flood-fill from edges to catch leftover bg islands similar to bg
  const seen = new Uint8Array(w * h);
  const q = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const idx = y * w + x;
    if (seen[idx]) return;
    seen[idx] = 1;
    q.push(idx);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  const floodThresh = threshold + 10;
  while (q.length) {
    const idx = q.pop();
    const i = idx * 4;
    const d = colorDist([out[i], out[i + 1], out[i + 2]], bg);
    // already transparent or close to bg → clear and expand
    if (out[i + 3] === 0 || d < floodThresh) {
      out[i + 3] = 0;
      const x = idx % w;
      const y = (idx / w) | 0;
      push(x + 1, y);
      push(x - 1, y);
      push(x, y + 1);
      push(x, y - 1);
    }
  }
  return out;
}

/** Largest opaque bounding box (downsampled scan). */
function largestOpaqueBBox(data, w, h, alphaMin = 40) {
  // Downsample grid for component labeling
  const step = 4;
  const gw = Math.ceil(w / step);
  const gh = Math.ceil(h / step);
  const label = new Int32Array(gw * gh);
  label.fill(-1);
  let current = 0;
  const sizes = [];
  const boxes = [];

  const opaque = (gx, gy) => {
    const x = Math.min(w - 1, gx * step + (step >> 1));
    const y = Math.min(h - 1, gy * step + (step >> 1));
    return data[(y * w + x) * 4 + 3] >= alphaMin;
  };

  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const i = gy * gw + gx;
      if (label[i] !== -1 || !opaque(gx, gy)) continue;
      // flood
      const stack = [i];
      label[i] = current;
      let minX = gx,
        maxX = gx,
        minY = gy,
        maxY = gy,
        count = 0;
      while (stack.length) {
        const cur = stack.pop();
        count++;
        const cx = cur % gw;
        const cy = (cur / gw) | 0;
        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);
        for (const [nx, ny] of [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ]) {
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const ni = ny * gw + nx;
          if (label[ni] !== -1 || !opaque(nx, ny)) continue;
          label[ni] = current;
          stack.push(ni);
        }
      }
      sizes[current] = count;
      boxes[current] = {
        left: minX * step,
        top: minY * step,
        width: (maxX - minX + 1) * step,
        height: (maxY - minY + 1) * step,
      };
      current++;
    }
  }

  if (!boxes.length) {
    return { left: 0, top: 0, width: w, height: h };
  }
  let best = 0;
  for (let i = 1; i < sizes.length; i++) {
    if ((sizes[i] || 0) > (sizes[best] || 0)) best = i;
  }
  const box = boxes[best];
  // pad
  const pad = Math.round(Math.max(box.width, box.height) * 0.06);
  const left = Math.max(0, box.left - pad);
  const top = Math.max(0, box.top - pad);
  const right = Math.min(w, box.left + box.width + pad);
  const bottom = Math.min(h, box.top + box.height + pad);
  return { left, top, width: right - left, height: bottom - top };
}

async function processFile(srcRel, { extractOverworld = false } = {}) {
  const src = path.join(ROOT, srcRel);
  const img = sharp(src);
  const meta = await img.metadata();
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const keyed = keyBackground(data, info.width, info.height);

  const pngBuf = await sharp(keyed, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();

  // Overwrite with real PNG
  fs.writeFileSync(src, pngBuf);
  const verify = await sharp(src).metadata();
  console.log(
    `✓ ${srcRel}  ${meta.format}→${verify.format}  ${verify.width}x${verify.height}  alpha=${verify.hasAlpha}`
  );

  if (extractOverworld) {
    // Battle sheets pack front + back + icons — prefer left/upper content.
    // Full NPC portraits: use the whole keyed frame's opaque bbox.
    const isSheet = /-sheet\.png$/i.test(src);
    const leftW = isSheet ? Math.floor(info.width * 0.55) : info.width;
    const topH = isSheet ? Math.floor(info.height * 0.78) : info.height;
    const sub = Buffer.alloc(leftW * topH * 4);
    for (let y = 0; y < topH; y++) {
      for (let x = 0; x < leftW; x++) {
        const si = (y * info.width + x) * 4;
        const di = (y * leftW + x) * 4;
        sub[di] = keyed[si];
        sub[di + 1] = keyed[si + 1];
        sub[di + 2] = keyed[si + 2];
        sub[di + 3] = keyed[si + 3];
      }
    }
    const crop = largestOpaqueBBox(sub, leftW, topH);
    const dir = path.dirname(src);
    const base = path
      .basename(src)
      .replace(/-sheet\.png$/i, "")
      .replace(/\.png$/i, "");
    const owFile = path.join(dir, `${base}-ow.png`);

    // Lobby billboards are ~1 tile tall — keep OW art small so they don't look
    // like giant battle portraits walking the map.
    const maxH = 96;
    await sharp(keyed, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .extract({
        left: crop.left,
        top: crop.top,
        width: Math.max(8, crop.width),
        height: Math.max(8, crop.height),
      })
      .resize({
        height: maxH,
        fit: "inside",
        withoutEnlargement: false,
      })
      .png({ compressionLevel: 9 })
      .toFile(owFile);

    const owMeta = await sharp(owFile).metadata();
    console.log(
      `  ↳ overworld ${path.relative(ROOT, owFile)}  ${owMeta.width}x${owMeta.height}`
    );
    return path.relative(ROOT, owFile);
  }
  return srcRel;
}

async function main() {
  const creatureSheets = fs
    .readdirSync(path.join(ROOT, "public/game-assets/creatures"))
    .filter((f) => f.endsWith("-sheet.png"))
    .map((f) => `public/game-assets/creatures/${f}`);
  const monsterSheets = fs
    .readdirSync(path.join(ROOT, "public/game-assets/world-monsters"))
    .filter((f) => f.endsWith("-sheet.png"))
    .map((f) => `public/game-assets/world-monsters/${f}`);
  const npcFiles = CUSTOM_NPCS.map((n) => `public/game-assets/npc/${n}.png`);
  const conceptSheets = [1, 2, 3, 4]
    .map((n) =>
      fs
        .readdirSync(path.join(ROOT, "public/game-assets"))
        .find((f) => f.startsWith(`sheet${n}_`) && f.endsWith(".png"))
    )
    .filter(Boolean)
    .map((f) => `public/game-assets/${f}`);

  console.log("Processing custom assets…");
  for (const f of [...creatureSheets, ...monsterSheets]) {
    await processFile(f, { extractOverworld: true });
  }
  for (const f of npcFiles) {
    // Keep full portrait for UI; also write small *-ow for lobby billboards.
    await processFile(f, { extractOverworld: true });
  }
  for (const f of conceptSheets) {
    await processFile(f, { extractOverworld: false });
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
