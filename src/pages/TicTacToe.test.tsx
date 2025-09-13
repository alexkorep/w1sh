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
    const player = "O";
    expect(canWinByOuterMove(index5x5, board, player)).toBe(true);
  });

  it('should return true for the user-provided failing case', () => {
    const board = [
        "X", "X", "O",
        "",  "O", "",
        "X", "",  ""
    ];
    const index5x5 = 4; // Top-right outer cell
    const player = "O";
    expect(canWinByOuterMove(index5x5, board, player)).toBe(true);
  });

  it('should return false if the move does not result in a win', () => {
    const board = [
      "X", "O", "X",
      "O", "X", "O",
      "O", "X", ""
    ];
    const index5x5 = 8; // Corresponds to board index 2, which is not a winning move
    const player = "O";
    expect(canWinByOuterMove(index5x5, board, player)).toBe(false);
  });

  it('should return false if the target cell is already occupied', () => {
    const board = [
      "O", "O", "X",
      "X", "O", "",
      "X", "", ""
    ];
    const index5x5 = 8; // Corresponds to board index 2, which is 'X'
    const player = "O";
    expect(canWinByOuterMove(index5x5, board, player)).toBe(false);
  });

  it('should return true for a winning move on the left edge', () => {
    const board = [
      "O", "X", "X",
      "", "O",  "",
      "X", "O", "X"
    ];
    const index5x5 = 11; // left edge, middle row, corresponds to index 3
    const player = "O";
    expect(canWinByOuterMove(index5x5, board, player)).toBe(true);
  });

  it('should return true for a winning move on the bottom edge', () => {
    const board = [
      "X", "O", "X",
      "O", "",  "O",
      "",  "X", ""
    ];
    const index5x5 = 21; // Bottom edge, second column, corresponds to index 7
    const player = "O";
    expect(canWinByOuterMove(index5x5, board, player)).toBe(true);
  });

  it('should handle various non-winning scenarios', () => {
    const board = [
      "X", "", "O",
      "", "O", "",
      "X", "", ""
    ];
    const player = "O";
    // All outer cells that don't lead to a win
    expect(canWinByOuterMove(0, board, player)).toBe(false);
    expect(canWinByOuterMove(1, board, player)).toBe(false);
    expect(canWinByOuterMove(2, board, player)).toBe(false);
    expect(canWinByOuterMove(3, board, player)).toBe(false);
    expect(canWinByOuterMove(5, board, player)).toBe(false);
    expect(canWinByOuterMove(9, board, player)).toBe(false);
    expect(canWinByOuterMove(10, board, player)).toBe(false);
    expect(canWinByOuterMove(14, board, player)).toBe(false);
    expect(canWinByOuterMove(15, board, player)).toBe(false);
    expect(canWinByOuterMove(19, board, player)).toBe(false);
    expect(canWinByOuterMove(20, board, player)).toBe(false);
    expect(canWinByOuterMove(22, board, player)).toBe(false);
    expect(canWinByOuterMove(23, board, player)).toBe(false);
    expect(canWinByOuterMove(24, board, player)).toBe(false);
  });
});
