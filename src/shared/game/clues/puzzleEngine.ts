/**
 * Saints Gaming — Sliding Tile Puzzle Box & Cipher Decryption Engine (Bible 18)
 * Manages 3x3 and 4x4 sliding tile puzzle mechanics, solvability validation, and anagram/caesar ciphers.
 */

export interface SlidingPuzzleState {
  size: 3 | 4;
  grid: number[]; // 0 denotes the empty tile, 1..(size^2 - 1) denote numbered tiles
}

/**
 * Generates a solved grid for a given puzzle dimension.
 */
export function createSolvedGrid(size: 3 | 4): number[] {
  const total = size * size;
  const grid: number[] = [];
  for (let i = 1; i < total; i++) {
    grid.push(i);
  }
  grid.push(0); // 0 at the end
  return grid;
}

/**
 * Determines whether a given tile permutation is mathematically solvable.
 */
export function isPuzzleSolvable(grid: number[], size: 3 | 4): boolean {
  let inversions = 0;
  const arr = grid.filter((x) => x !== 0);

  for (let i = 0; i < arr.length - 1; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] > arr[j]) {
        inversions++;
      }
    }
  }

  if (size === 3) {
    // Odd grid: Solvable if inversions are even
    return inversions % 2 === 0;
  } else {
    // Even grid: Solvable if (blank row from bottom + inversions) is odd
    const blankIndex = grid.indexOf(0);
    const blankRowFromBottom = size - Math.floor(blankIndex / size);
    if (blankRowFromBottom % 2 === 0) {
      return inversions % 2 === 1;
    } else {
      return inversions % 2 === 0;
    }
  }
}

/**
 * Checks if the puzzle grid matches the solved target layout.
 */
export function isPuzzleSolved(grid: number[], size: 3 | 4): boolean {
  const solved = createSolvedGrid(size);
  if (grid.length !== solved.length) return false;
  return grid.every((val, idx) => val === solved[idx]);
}

/**
 * Attempts to slide a tile into the adjacent empty space.
 */
export function moveTile(
  state: SlidingPuzzleState,
  tileIndex: number
): { success: boolean; isSolved: boolean; reason?: string } {
  const { size, grid } = state;
  const emptyIndex = grid.indexOf(0);

  if (tileIndex < 0 || tileIndex >= grid.length || grid[tileIndex] === 0) {
    return { success: false, isSolved: false, reason: 'Invalid tile selected.' };
  }

  const tileRow = Math.floor(tileIndex / size);
  const tileCol = tileIndex % size;
  const emptyRow = Math.floor(emptyIndex / size);
  const emptyCol = emptyIndex % size;

  const isAdjacent =
    (Math.abs(tileRow - emptyRow) === 1 && tileCol === emptyCol) ||
    (Math.abs(tileCol - emptyCol) === 1 && tileRow === emptyRow);

  if (!isAdjacent) {
    return { success: false, isSolved: false, reason: 'Tile is not adjacent to the empty slot.' };
  }

  // Swap
  grid[emptyIndex] = grid[tileIndex];
  grid[tileIndex] = 0;

  const solved = isPuzzleSolved(grid, size);
  return { success: true, isSolved: solved };
}

/**
 * Decrypts a Caesar cipher shift string.
 */
export function decryptCaesarCipher(ciphertext: string, shift: number): string {
  return ciphertext
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      // Uppercase A-Z
      if (code >= 65 && code <= 90) {
        return String.fromCharCode(((code - 65 - shift + 26) % 26) + 65);
      }
      // Lowercase a-z
      if (code >= 97 && code <= 122) {
        return String.fromCharCode(((code - 97 - shift + 26) % 26) + 97);
      }
      return char;
    })
    .join('');
}

/**
 * Solves an anagram riddle against a list of candidate dictionary words.
 */
export function solveAnagram(scrambled: string, candidates: string[]): string | undefined {
  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z]/g, '').split('').sort().join('');
  const target = normalize(scrambled);
  return candidates.find((c) => normalize(c) === target);
}
