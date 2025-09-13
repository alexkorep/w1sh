import { describe, it, expect } from 'vitest';
import { canWinByOuterMove } from './TicTacToe';

describe('canWinByOuterMove', () => {
  it('should return true for a winning move in the top-right corner', () => {
    const board = [
      "X", "X", "",
      "",  "O", "",
      "O", "",  ""
    ];
    const index5x5 = 8; // Corresponds to board index 2
    // This move should win because it completes the diagonal O-O-O
    const tempBoard = [...board];
    tempBoard[2] = "O";
    expect(canWinByOuterMove(board, index5x5)).toBe(true);
  });

  it('should return true for the user-provided failing case', () => {
    const board = [
        "X", "X", "O",
        "",  "O", "",
        "X", "",  ""
    ];
    const index5x5 = 4; // Top-right outer cell
    expect(canWinByOuterMove(board, index5x5)).toBe(true);
  });

  it('should return false if the move does not result in a win', () => {
    const board = [
      "X", "O", "X",
      "O", "X", "O",
      "O", "X", ""
    ];
    const index5x5 = 8; // Corresponds to board index 2, which is not a winning move
    expect(canWinByOuterMove(board, index5x5)).toBe(false);
  });

  it('should return false if the target cell is already occupied', () => {
    const board = [
      "O", "O", "X",
      "X", "O", "",
      "X", "", ""
    ];
    const index5x5 = 8; // Corresponds to board index 2, which is 'X'
    expect(canWinByOuterMove(board, index5x5)).toBe(false);
  });

  it('should return true for a winning move on the left edge', () => {
    const board = [
      "O", "X", "X",
      "", "O",  "",
      "X", "O", "X"
    ];
    const index5x5 = 11; // left edge, middle row, corresponds to index 3
    expect(canWinByOuterMove(board, index5x5)).toBe(true);
  });

    it('should return true for a winning move on the bottom edge', () => {
    const board = [
      "X", "O", "X",
      "O", "",  "O",
      "",  "X", ""
    ];
    const index5x5 = 21; // Bottom edge, second column, corresponds to index 7
    expect(canWinByOuterMove(board, index5x5)).toBe(true);
  });

  it('should handle various non-winning scenarios', () => {
    const board = [
      "X", "", "O",
      "", "O", "",
      "X", "", ""
    ];
    // All outer cells that don't lead to a win
    expect(canWinByOuterMove(board, 0)).toBe(false);
    expect(canWinByOuterMove(board, 1)).toBe(false);
    expect(canWinByOuterMove(board, 2)).toBe(false);
    expect(canWinByOuterMove(board, 3)).toBe(false);
    expect(canWinByOuterMove(board, 5)).toBe(false);
    expect(canWinByOuterMove(board, 9)).toBe(false);
    expect(canWinByOuterMove(board, 10)).toBe(false);
    expect(canWinByOuterMove(board, 14)).toBe(false);
    expect(canWinByOuterMove(board, 15)).toBe(false);
    expect(canWinByOuterMove(board, 19)).toBe(false);
    expect(canWinByOuterMove(board, 20)).toBe(false);
    expect(canWinByOuterMove(board, 22)).toBe(false);
    expect(canWinByOuterMove(board, 23)).toBe(false);
    expect(canWinByOuterMove(board, 24)).toBe(false);
  });
});
