import { describe, it, expect } from 'vitest';
import {
  createSolvedGrid,
  isPuzzleSolvable,
  isPuzzleSolved,
  moveTile,
  decryptCaesarCipher,
  solveAnagram,
  SlidingPuzzleState,
} from './puzzleEngine';

describe('Sliding Tile Puzzle Box & Cipher Decryption Engine (Bible 18)', () => {
  it('creates solved grids and validates solved states', () => {
    const solved3 = createSolvedGrid(3);
    expect(solved3).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
    expect(isPuzzleSolved(solved3, 3)).toBe(true);

    const solved4 = createSolvedGrid(4);
    expect(solved4.length).toBe(16);
    expect(solved4[15]).toBe(0);
    expect(isPuzzleSolved(solved4, 4)).toBe(true);
  });

  it('determines puzzle solvability via parity and inversion checks', () => {
    // Standard solved 3x3 is solvable (0 inversions)
    expect(isPuzzleSolvable([1, 2, 3, 4, 5, 6, 7, 8, 0], 3)).toBe(true);

    // Swap last two tiles (1 inversion) -> Unsolvable for 3x3
    expect(isPuzzleSolvable([1, 2, 3, 4, 5, 6, 8, 7, 0], 3)).toBe(false);
  });

  it('moves adjacent tiles into empty space and detects puzzle completion', () => {
    // 3x3 with one tile out of place: [1, 2, 3, 4, 5, 6, 7, 0, 8]
    // 0 is at index 7, 8 is at index 8 (adjacent)
    const state: SlidingPuzzleState = {
      size: 3,
      grid: [1, 2, 3, 4, 5, 6, 7, 0, 8],
    };

    // Non-adjacent move (index 0 cannot swap with index 7)
    const invalidMove = moveTile(state, 0);
    expect(invalidMove.success).toBe(false);

    // Valid move (index 8 slides into index 7)
    const validMove = moveTile(state, 8);
    expect(validMove.success).toBe(true);
    expect(validMove.isSolved).toBe(true); // Puzzle is now solved: [1, 2, 3, 4, 5, 6, 7, 8, 0]
  });

  it('decrypts Caesar ciphers and solves anagram clues', () => {
    // Caesar shift: "KHOOR" with shift 3 -> "HELLO"
    expect(decryptCaesarCipher('KHOOR', 3)).toBe('HELLO');
    expect(decryptCaesarCipher('Khoor Zruog!', 3)).toBe('Hello World!');

    // Anagram matching
    const candidates = ['Wise Old Man', 'King Roald', 'Zulrah', 'Archmage'];
    expect(solveAnagram('Old Man Wise', candidates)).toBe('Wise Old Man');
  });
});
