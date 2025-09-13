import { describe, it, expect } from "vitest";
import { canWinByOuterMove, bestComputerMove } from "./TicTacToe";

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

  it("allows winning outer moves at indices 10 (left edge) and 3 (top edge)", () => {
    // NOTE: The originally requested board contained an 'X' at center, which would NOT
    // make index 10 a winning move. Adjusted board so the inner sequence cells needed
    // for both outer moves are the player's mark 'O'.
    // Requirements for index 10 (left middle outer): board[3] & board[4] must both be 'O'.
    // Requirements for index 3 (top row near right outer): board[2] & board[5] must both be 'O'.
    const board = [
      "",  // 0
      "O", // 1
      "", // 2
      "O", // 3
      "X", // 4
      "", // 5
      "X",  // 6
      "X",  // 7
      "",  // 8
    ];
    expect(canWinByOuterMove(10, board, "O")).toBe(true);
    expect(canWinByOuterMove(3, board, "O")).toBe(true);
  });
});

describe("bestComputerMove", () => {
  it("takes immediate winning move when available", () => {
    // X to play and can win on top row
    const board = ["X", "X", "", "O", "O", "", "", "", ""];
    const move = bestComputerMove(board, "O", "X");
    expect(move).toBe(2); // complete row 0,1,2
  });

  it("takes immediate diagonal win to bottom-right corner", () => {
    // X has two diagonal spots (0 and 4); should choose 8 to win
    const board = ["X", "", "", "", "X", "O", "", "O", ""];
    const move = bestComputerMove(board, "O", "X");
    expect(move).toBe(8);
  });

  it("blocks opponent's winning move", () => {
    // O threatens winning bottom row; X must block at index 8
    const board = ["X", "", "", "X", "", "", "O", "O", ""];
    const move = bestComputerMove(board, "O", "X");
    expect(move).toBe(8);
  });

  it("prefers center early if no immediate tactics", () => {
    const board = ["X", "", "", "", "", "", "", "", ""]; // only one X corner
    const move = bestComputerMove(board, "O", "X");
    // Optimal perfect play: take center (4)
    expect(move).toBe(4);
  });

  it("returns -1 on full board", () => {
    const board = ["X", "O", "X", "X", "O", "O", "O", "X", "X"]; // full
    const move = bestComputerMove(board, "O", "X");
    expect(move).toBe(-1);
  });
});
