/**
 * Saints Gaming — Seedable Simplex Noise & Fractal Brownian Motion (fBm)
 *
 * Deterministic 2D procedural noise generator based on standard 2D Simplex lattice,
 * supporting multi-octave fBm synthesis for natural terrain generation.
 */

import { BiomeTerrainConfig } from './biomeSchema';

const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

const GRAD3: [number, number][] = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

export class SimplexNoise2D {
  private perm: Uint8Array = new Uint8Array(512);

  constructor(seed: number = 0) {
    this.reseed(seed);
  }

  public reseed(seed: number): void {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }

    // Seeded LCG shuffle
    let s = (seed ^ 0xdeadbeef) >>> 0;
    const nextRandom = () => {
      s = (Math.imul(1664525, s) + 1013904223) >>> 0;
      return s / 4294967296;
    };

    for (let i = 255; i > 0; i--) {
      const j = Math.floor(nextRandom() * (i + 1));
      const temp = p[i];
      p[i] = p[j];
      p[j] = temp;
    }

    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  /**
   * Generates continuous 2D Simplex noise in range [-1.0 .. 1.0].
   */
  public noise2D(xin: number, yin: number): number {
    let n0 = 0, n1 = 0, n2 = 0;

    // Skew the input space to determine which simplex cell we're in
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);

    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;

    // Determine simplex triangle coordinates
    let i1 = 0, j1 = 0;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;

    // Contribution from the three corners
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      const gi0 = this.perm[ii + this.perm[jj]] % 8;
      t0 *= t0;
      n0 = t0 * t0 * (GRAD3[gi0][0] * x0 + GRAD3[gi0][1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 8;
      t1 *= t1;
      n1 = t1 * t1 * (GRAD3[gi1][0] * x1 + GRAD3[gi1][1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 8;
      t2 *= t2;
      n2 = t2 * t2 * (GRAD3[gi2][0] * x2 + GRAD3[gi2][1] * y2);
    }

    // Scale to range [-1.0 .. 1.0]
    return 70.0 * (n0 + n1 + n2);
  }

  /**
   * Evaluates fractal Brownian motion (fBm) over configured octaves.
   * Returns normalized elevation offset in [-amplitude .. +amplitude].
   */
  public fBm(x: number, z: number, config: BiomeTerrainConfig): number {
    let total = 0;
    let currentAmp = 1.0;
    let currentFreq = config.frequency;
    let maxAmp = 0;

    for (let o = 0; o < config.octaves; o++) {
      total += this.noise2D(x * currentFreq, z * currentFreq) * currentAmp;
      maxAmp += currentAmp;
      currentAmp *= config.persistence;
      currentFreq *= config.lacunarity;
    }

    const normalized = maxAmp > 0 ? total / maxAmp : 0;
    return normalized * config.amplitude;
  }
}
