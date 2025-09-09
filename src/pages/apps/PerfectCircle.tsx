import { useCallback, useEffect, useRef, useState } from "react";

export default function PerfectCircle(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawingRef = useRef(false);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);

  const [score, setScore] = useState<number | null>(null);
  const [instruction, setInstruction] = useState(
    "> DRAW A CIRCLE WITH ONE STROKE <"
  );
  const [highScore, setHighScore] = useState(0);

  const HIGH_SCORE_KEY = "perfectCircleHighScore";

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.strokeStyle = "#00ff41";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#00ff41";
  }, []);

  const resetGame = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pointsRef.current = [];
    setupCanvas();
    setScore(null);
    setInstruction("> DRAW A CIRCLE WITH ONE STROKE <");
  }, [setupCanvas]);

  const getCoords = (e: MouseEvent | TouchEvent) => {
    if (e instanceof TouchEvent && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    const evt = e as MouseEvent;
    return { x: evt.clientX, y: evt.clientY };
  };

  const startDrawing = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isDrawingRef.current = true;
      resetGame();
      const { x, y } = getCoords(e);
      pointsRef.current.push({ x, y });
      ctxRef.current?.beginPath();
      ctxRef.current?.moveTo(x, y);
    },
    [resetGame]
  );

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const { x, y } = getCoords(e);
    pointsRef.current.push({ x, y });
    ctxRef.current?.lineTo(x, y);
    ctxRef.current?.stroke();
  }, []);

  const analyzeAndScore = useCallback(() => {
    const pts = pointsRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (pts.length < 20) {
      setScore(0);
      setInstruction("> NOT ENOUGH DATA. DRAW BIGGER. <");
      return;
    }
    let sumX = 0;
    let sumY = 0;
    pts.forEach((p) => {
      sumX += p.x;
      sumY += p.y;
    });
    const centerX = sumX / pts.length;
    const centerY = sumY / pts.length;

    const distances = pts.map((p) =>
      Math.hypot(p.x - centerX, p.y - centerY)
    );
    const avgRadius =
      distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const variance =
      distances.reduce((sum, d) => sum + (d - avgRadius) ** 2, 0) /
      distances.length;
    const stdDev = Math.sqrt(variance);

    const scoreValue = Math.max(0, 100 - (stdDev / avgRadius) * 400);
    const roundedScore = Math.round(scoreValue);
    setScore(roundedScore);

    if (roundedScore > highScore) {
      setHighScore(roundedScore);
      localStorage.setItem(HIGH_SCORE_KEY, String(roundedScore));
      setInstruction("> NEW HIGH SCORE! <");
    } else {
      setInstruction(
        scoreValue > 90
          ? "> SYSTEM CALL: PERFECTION! <"
          : "> ANALYSIS COMPLETE <"
      );
    }

    ctx.strokeStyle = "rgba(0, 255, 65, 0.4)";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(centerX, centerY, avgRadius, 0, Math.PI * 2);
    ctx.stroke();
  }, [highScore]);

  const stopDrawing = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    ctxRef.current?.closePath();
    analyzeAndScore();
  }, [analyzeAndScore]);

  const loadHighScore = useCallback(() => {
    const saved = localStorage.getItem(HIGH_SCORE_KEY);
    setHighScore(saved ? parseInt(saved, 10) : 0);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    ctxRef.current = canvas.getContext("2d");

    setupCanvas();
    loadHighScore();

    window.addEventListener("resize", setupCanvas);
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    window.addEventListener("mouseup", stopDrawing);

    canvas.addEventListener("touchstart", startDrawing);
    canvas.addEventListener("touchmove", draw);
    window.addEventListener("touchend", stopDrawing);

    return () => {
      window.removeEventListener("resize", setupCanvas);
      canvas.removeEventListener("mousedown", startDrawing);
      canvas.removeEventListener("mousemove", draw);
      window.removeEventListener("mouseup", stopDrawing);
      canvas.removeEventListener("touchstart", startDrawing);
      canvas.removeEventListener("touchmove", draw);
      window.removeEventListener("touchend", stopDrawing);
    };
  }, [setupCanvas, startDrawing, draw, stopDrawing, loadHighScore]);

  const css = `
  @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
  :root {
    --crt-bg: #0a0e0a;
    --crt-fg: #00ff41;
    --crt-fg-dim: #008021;
  }
  html, body {
    margin: 0;
    padding: 0;
    overflow: hidden;
    height: 100%;
    width: 100%;
    background-color: var(--crt-bg);
    color: var(--crt-fg);
    font-family: 'VT323', monospace;
    cursor: crosshair;
  }
  .crt-container {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
  }
  .crt-container::after {
    content: " ";
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    background: repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.4),
      rgba(0, 0, 0, 0.4) 1px,
      transparent 1px,
      transparent 3px
    );
    pointer-events: none;
    z-index: 10;
  }
  .crt-container::before {
    content: " ";
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    box-shadow: inset 0 0 120px 20px rgba(0, 255, 65, 0.2);
    pointer-events: none;
    z-index: 11;
  }
  canvas {
    position: absolute;
    top: 0;
    left: 0;
    touch-action: none;
  }
  .ui-overlay {
    position: relative;
    z-index: 5;
    pointer-events: none;
    text-shadow: 0 0 5px var(--crt-fg), 0 0 10px var(--crt-fg);
    animation: flicker 0.15s infinite;
  }
  h1 {
    font-size: 3em;
    margin-bottom: 0;
  }
  p#instructions, #high-score-display {
    font-size: 1.5em;
    max-width: 90%;
  }
  #high-score-display {
    color: var(--crt-fg-dim);
    text-shadow: 0 0 5px var(--crt-fg-dim);
    height: 1.5em;
  }
  #score-display {
    font-size: 6em;
  }
  #reset-button {
    pointer-events: all;
    background: none;
    border: 2px solid var(--crt-fg);
    color: var(--crt-fg);
    font-family: 'VT323', monospace;
    font-size: 2em;
    padding: 10px 20px;
    margin-top: 20px;
    text-shadow: 0 0 5px var(--crt-fg);
    cursor: pointer;
    box-shadow: inset 0 0 10px var(--crt-fg-dim);
  }
  #reset-button:hover {
    background: var(--crt-fg-dim);
  }
  @keyframes flicker {
    0% { opacity: 0.95; }
    19% { opacity: 0.95; }
    20% { opacity: 1; }
    29% { opacity: 1; }
    30% { opacity: 0.95; }
    49% { opacity: 0.95; }
    50% { opacity: 1; }
    100% { opacity: 1; }
  }
  `;

  return (
    <div className="crt-container">
      <style>{css}</style>
      <canvas ref={canvasRef} id="draw-canvas"></canvas>
      <div className="ui-overlay">
        <h1>PERFECT CIRCLE</h1>
        <div id="high-score-display">HIGH SCORE: {highScore}%</div>
        <p id="instructions">{instruction}</p>
        {score !== null && <div id="score-display">{score}%</div>}
      </div>
      {score !== null && (
        <button id="reset-button" onClick={resetGame}>
          &gt; TRY AGAIN &lt;
        </button>
      )}
    </div>
  );
}

