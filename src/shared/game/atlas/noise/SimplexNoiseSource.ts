import { INoiseSource } from './INoiseSource';

/**
 * Deterministic 32-bit hash for seed strings.
 */
export function hashSeed(seed: string | number): number {
  if (typeof seed === 'number') return seed >>> 0;
  const str = String(seed);
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Mulberry32 PRNG — high-quality 32-bit deterministic PRNG.
 */
export class DeterministicRandom {
  private state: number;

  constructor(seed: string | number) {
    this.state = hashSeed(seed);
  }

  public nextFloat(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public nextInt(min: number, max: number): number {
    return Math.floor(min + this.nextFloat() * (max - min + 1));
  }
}

/**
 * 2D/3D Gradient Perlin Noise implementation with deterministic seed permutation.
 */
export class SimplexNoiseSource implements INoiseSource {
  private perm: Uint8Array;

  constructor(seed: string | number) {
    const rng = new DeterministicRandom(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;

    // Fisher-Yates shuffle
    for (let i = 255; i > 0; i--) {
      const j = rng.nextInt(0, i);
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }

    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad2(hash: number, x: number, y: number): number {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  private grad3(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  public sample2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.perm[this.perm[X] + Y];
    const ab = this.perm[this.perm[X] + Y + 1];
    const ba = this.perm[this.perm[X + 1] + Y];
    const bb = this.perm[this.perm[X + 1] + Y + 1];

    const x1 = this.lerp(u, this.grad2(aa, xf, yf), this.grad2(ba, xf - 1, yf));
    const x2 = this.lerp(u, this.grad2(ab, xf, yf - 1), this.grad2(bb, xf - 1, yf - 1));

    // Normalize to -1.0 .. 1.0 (Gradient noise max is ~1.4, so scale appropriately)
    return this.lerp(v, x1, x2);
  }

  public sample3D(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);

    const u = this.fade(xf);
    const v = this.fade(yf);
    const w = this.fade(zf);

    const A = this.perm[X] + Y, AA = this.perm[A] + Z, AB = this.perm[A + 1] + Z;
    const B = this.perm[X + 1] + Y, BA = this.perm[B] + Z, BB = this.perm[B + 1] + Z;

    const x1 = this.lerp(u, this.grad3(this.perm[AA], xf, yf, zf), this.grad3(this.perm[BA], xf - 1, yf, zf));
    const x2 = this.lerp(u, this.grad3(this.perm[AB], xf, yf - 1, zf), this.grad3(this.perm[BB], xf - 1, yf - 1, zf));
    const y1 = this.lerp(v, x1, x2);

    const x3 = this.lerp(u, this.grad3(this.perm[AA + 1], xf, yf, zf - 1), this.grad3(this.perm[BA + 1], xf - 1, yf, zf - 1));
    const x4 = this.lerp(u, this.grad3(this.perm[AB + 1], xf, yf - 1, zf - 1), this.grad3(this.perm[BB + 1], xf - 1, yf - 1, zf - 1));
    const y2 = this.lerp(v, x3, x4);

    return this.lerp(w, y1, y2);
  }
}
