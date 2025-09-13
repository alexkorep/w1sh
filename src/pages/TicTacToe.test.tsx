import { describe, it, expect } from "vitest";
import { canWinByOuterMove } from "./TicTacToe";

describe("canWinByOuterMove", () => {
  it("returns true for a winning move at the top-right outer corner", () => {
    const board = ["X", "X", "O", "", "O", "", "X", "", ""];
    const index5x5 = 4; // (4,0). step1=(3,1)->board[2], step2=(2,2)->board[4]
    expect(canWinByOuterMove(index5x5, board, "O")).toBe(true);
  });

  it("returns true for a winning move on the left outer edge (middle)", () => {
    const board = ["", "", "", "O", "O", "", "", "", ""];
    const index5x5 = 10; // (0,2). step1=(1,2)->board[3], step2=(2,2)->board[4]
    expect(canWinByOuterMove(index5x5, board, "O")).toBe(true);
  });

  it("returns true for a winning move on the bottom outer edge (second column)", () => {
    const board = ["", "", "", "O", "", "", "O", "", ""];
    const index5x5 = 21; // (1,4). step1=(1,3)->board[6], step2=(1,2)->board[3]
    expect(canWinByOuterMove(index5x5, board, "O")).toBe(true);
  });

  it("returns false when index5x5 is not on the outer border", () => {
    const board = ["X", "X", "", "", "O", "", "O", "", ""];
    const index5x5 = 8; // (3,1) — inside the 3x3
    expect(canWinByOuterMove(index5x5, board, "O")).toBe(false);
  });

  it("returns false if the move does not result in a win", () => {
    const board = ["X", "O", "X", "O", "X", "O", "O", "X", ""];
    const index5x5 = 4; // top-right outer corner, but the two nearest inner cells aren’t both "O"
    expect(canWinByOuterMove(index5x5, board, "O")).toBe(false);
  });

  it("handles various non-winning outer cells", () => {
    const board = ["X", "", "O", "", "O", "", "X", "", ""];
    const outerCells = [0, 1, 2, 3, 5, 9, 10, 14, 15, 19, 20, 22, 23, 24];
    outerCells.forEach((i) =>
      expect(canWinByOuterMove(i, board, "O")).toBe(false)
    );
  });
});
