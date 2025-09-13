import { useEffect } from "react";

export default function TicTacToe({ onExit }: { onExit: () => void }): JSX.Element {
  useEffect(() => {
    const allCells = Array.from(document.querySelectorAll<HTMLDivElement>(".cell"));
    const statusMessage = document.getElementById("status-message") as HTMLElement;
    const restartButton = document.getElementById("restart-button") as HTMLButtonElement;
    const exitButton = document.getElementById("exit-button") as HTMLButtonElement;

    const player = "O";
    const computer = "X";

    let board = ["", "", "", "", "", "", "", "", ""];
    let isGameActive = true;

    const map3x3To5x5 = [6, 7, 8, 11, 12, 13, 16, 17, 18];

    const winningConditions = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    const hiddenWinConditions: Record<number, [number, number]> = {
      0: [4, 8],
      4: [4, 6],
      20: [2, 4],
      24: [0, 4],
      1: [3, 6],
      2: [4, 7],
      3: [5, 8],
      21: [0, 3],
      22: [1, 4],
      23: [2, 5],
      5: [1, 2],
      10: [4, 5],
      15: [7, 8],
      9: [0, 1],
      14: [3, 4],
      19: [6, 7],
    };

    function checkWinner(currentBoard: string[], mark: string) {
      return winningConditions.some((condition) =>
        condition.every((index) => currentBoard[index] === mark)
      );
    }

    function getAvailableMoves(currentBoard: string[]) {
      return currentBoard
        .map((cell, index) => (cell === "" ? index : null))
        .filter((val): val is number => val !== null);
    }

    function minimax(newBoard: string[], currentMark: string): any {
      const availableMoves = getAvailableMoves(newBoard);
      if (checkWinner(newBoard, player)) return { score: -10 };
      if (checkWinner(newBoard, computer)) return { score: 10 };
      if (availableMoves.length === 0) return { score: 0 };

      const moves: any[] = [];
      for (let i = 0; i < availableMoves.length; i++) {
        const move: any = {};
        const index = availableMoves[i];
        move.index = index;
        newBoard[index] = currentMark;

        if (currentMark === computer) {
          move.score = minimax(newBoard, player).score;
        } else {
          move.score = minimax(newBoard, computer).score;
        }
        newBoard[index] = "";
        moves.push(move);
      }

      let bestMove = 0;
      if (currentMark === computer) {
        let bestScore = -10000;
        moves.forEach((move, i) => {
          if (move.score > bestScore) {
            bestScore = move.score;
            bestMove = i;
          }
        });
      } else {
        let bestScore = 10000;
        moves.forEach((move, i) => {
          if (move.score < bestScore) {
            bestScore = move.score;
            bestMove = i;
          }
        });
      }
      return moves[bestMove];
    }

    function updateBoard(index3x3: number, mark: string) {
      board[index3x3] = mark;
      const index5x5 = map3x3To5x5[index3x3];
      const cell = document.querySelector<HTMLDivElement>(
        `.cell[data-index='${index5x5}']`
      );
      if (cell) {
        cell.textContent = mark;
        cell.classList.add(mark.toLowerCase());
      }
    }

    function checkResult() {
      if (checkWinner(board, computer)) {
        endGame("SYSTEM WINS. GAME OVER.");
        return true;
      }
      if (getAvailableMoves(board).length === 0) {
        endGame("STALEMATE. NO WINNER.");
        return true;
      }
      return false;
    }

    function endGame(message: string) {
      isGameActive = false;
      statusMessage.textContent = message;
      restartButton.style.display = "block";
      document.body.style.pointerEvents = "auto";
    }

    function computerMove() {
      statusMessage.textContent = "SYSTEM THINKING...";
      document.body.style.pointerEvents = "none";

      setTimeout(() => {
        const bestMove = minimax(board, computer);
        updateBoard(bestMove.index, computer);
        if (checkResult()) return;
        statusMessage.textContent = "YOUR TURN (O)";
        document.body.style.pointerEvents = "auto";
      }, 800 + Math.random() * 500);
    }

    function handleInnerCellClick(e: Event) {
      const target = e.target as HTMLElement;
      const index5x5 = parseInt(target.getAttribute("data-index") || "0", 10);
      const index3x3 = map3x3To5x5.indexOf(index5x5);

      if (board[index3x3] !== "" || !isGameActive) return;

      updateBoard(index3x3, player);
      if (checkResult()) return;

      computerMove();
    }

    function handleOuterCellClick(e: Event) {
      if (!isGameActive) return;

      const target = e.target as HTMLElement;
      const index5x5 = parseInt(target.getAttribute("data-index") || "0", 10);
      const condition = hiddenWinConditions[index5x5];

      if (condition) {
        const [req1, req2] = condition;
        if (board[req1] === player && board[req2] === player) {
          target.textContent = player;
          target.classList.add(player.toLowerCase());
          endGame("!! ANOMALY DETECTED. PLAYER WINS. !!");
        }
      }
    }

    function startGame() {
      board = ["", "", "", "", "", "", "", "", ""];
      isGameActive = true;
      statusMessage.textContent = "AWAITING SYSTEM MOVE";
      restartButton.style.display = "none";
      allCells.forEach((cell) => {
        cell.textContent = "";
        cell.classList.remove("x", "o");
      });
      computerMove();
    }

    allCells.forEach((cell) => {
      if (cell.classList.contains("inner-cell")) {
        cell.addEventListener("click", handleInnerCellClick);
      } else {
        cell.addEventListener("click", handleOuterCellClick);
      }
    });

    restartButton.addEventListener("click", startGame);
    exitButton.addEventListener("click", onExit);

    startGame();

    return () => {
      allCells.forEach((cell) => {
        if (cell.classList.contains("inner-cell")) {
          cell.removeEventListener("click", handleInnerCellClick);
        } else {
          cell.removeEventListener("click", handleOuterCellClick);
        }
      });
      restartButton.removeEventListener("click", startGame);
      exitButton.removeEventListener("click", onExit);
      document.body.style.pointerEvents = "auto";
    };
  }, [onExit]);

  const css = `
        @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');

        :root {
            --crt-bg: #0a0a0a;
            --crt-green: #3f3;
            --crt-green-dark: #0f0;
            --crt-glitch: rgba(63, 255, 63, 0.2);
        }

        @keyframes flicker {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.95; }
        }

        @keyframes text-flicker {
            0% { opacity: 0.8; }
            5% { opacity: 1; }
            10% { opacity: 0.85; }
            20% { opacity: 1; }
            100% { opacity: 1; }
        }

        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
        }

        @keyframes border-flicker {
            0% { border-color: var(--crt-glitch); }
            50% { border-color: transparent; }
            100% { border-color: var(--crt-glitch); }
        }

        body {
            background-color: var(--crt-bg);
            color: var(--crt-green);
            font-family: 'VT323', monospace;
            font-size: 22px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            overflow: hidden;
            text-transform: uppercase;
        }

        .screen {
            width: 400px;
            background: var(--crt-bg);
            padding: 20px;
            border-radius: 10px;
            box-shadow: inset 0 0 15px rgba(0,0,0,0.7);
            position: relative;
            overflow: hidden;
            animation: flicker 0.15s infinite;
        }

        .screen::before {
            content: " ";
            display: block;
            position: absolute;
            top: 0; left: 0; bottom: 0; right: 0;
            background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
            z-index: 2;
            background-size: 100% 3px, 4px 100%;
            pointer-events: none;
        }

        .content {
            text-shadow: 0 0 5px var(--crt-green-dark), 0 0 10px var(--crt-green-dark);
            animation: text-flicker 3s linear infinite;
            text-align: center;
        }

        h1 {
            font-size: 2em;
            margin: 0 0 15px 0;
            letter-spacing: 2px;
        }

        #game-board {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            width: 350px;
            height: 350px;
            margin: 20px auto;
        }

        .cell {
            width: 70px;
            height: 70px;
            box-sizing: border-box;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 3.5em;
            position: relative;
        }

        .inner-cell {
            border: 1px solid var(--crt-green);
            cursor: pointer;
        }

        .inner-cell:not(.x):not(.o):hover::after {
            content: 'O';
            opacity: 0.3;
        }

        .inner-cell:empty::after {
            content: '_';
            animation: blink 1s step-end infinite;
        }

        /* --- Style for the hidden outer cells --- */
        .outer-cell {
            border: 1px dashed transparent;
            animation: border-flicker 2s linear infinite;
            cursor: help;
        }

        .outer-cell:hover {
            background-color: rgba(63, 255, 63, 0.1);
            box-shadow: inset 0 0 10px rgba(63, 255, 63, 0.2);
        }

        #status-message {
            height: 30px;
            margin-top: 20px;
            font-size: 1.2em;
        }

        #status-message::before { content: '> '; }

        #restart-button, #exit-button {
            background-color: transparent;
            border: 2px solid var(--crt-green);
            color: var(--crt-green);
            font-family: 'VT323', monospace;
            font-size: 1.1em;
            padding: 8px 15px;
            margin-top: 15px;
            cursor: pointer;
            text-transform: uppercase;
            text-shadow: 0 0 5px var(--crt-green-dark);
        }

        #restart-button { display: none; }
        #exit-button { margin-left: 10px; }

        #restart-button:hover, #exit-button:hover {
            background-color: var(--crt-green);
            color: var(--crt-bg);
            box-shadow: 0 0 15px var(--crt-green);
        }
    `;

  return (
    <div className="screen">
      <style>{css}</style>
      <div className="content">
        <h1>TICTACTO.EXE</h1>
        <div id="game-board">
          <div className="cell outer-cell" data-index="0"></div>
          <div className="cell outer-cell" data-index="1"></div>
          <div className="cell outer-cell" data-index="2"></div>
          <div className="cell outer-cell" data-index="3"></div>
          <div className="cell outer-cell" data-index="4"></div>
          <div className="cell outer-cell" data-index="5"></div>
          <div className="cell inner-cell" data-index="6"></div>
          <div className="cell inner-cell" data-index="7"></div>
          <div className="cell inner-cell" data-index="8"></div>
          <div className="cell outer-cell" data-index="9"></div>
          <div className="cell outer-cell" data-index="10"></div>
          <div className="cell inner-cell" data-index="11"></div>
          <div className="cell inner-cell" data-index="12"></div>
          <div className="cell inner-cell" data-index="13"></div>
          <div className="cell outer-cell" data-index="14"></div>
          <div className="cell outer-cell" data-index="15"></div>
          <div className="cell inner-cell" data-index="16"></div>
          <div className="cell inner-cell" data-index="17"></div>
          <div className="cell inner-cell" data-index="18"></div>
          <div className="cell outer-cell" data-index="19"></div>
          <div className="cell outer-cell" data-index="20"></div>
          <div className="cell outer-cell" data-index="21"></div>
          <div className="cell outer-cell" data-index="22"></div>
          <div className="cell outer-cell" data-index="23"></div>
          <div className="cell outer-cell" data-index="24"></div>
        </div>
        <div id="status-message">INITIALIZING...</div>
        <div>
          <button id="restart-button">REBOOT_GAME.BAT</button>
          <button id="exit-button">EXIT</button>
        </div>
      </div>
    </div>
  );
}

