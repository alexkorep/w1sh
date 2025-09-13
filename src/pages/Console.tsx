// @ts-nocheck
import { useEffect, useState, useCallback, useMemo } from "react";
import type { Page } from "../hooks/useGameState";
import ConsoleScreen from "../components/ConsoleScreen";
import CommandChips from "../components/CommandChips";
import VirtualKeyboard from "../components/VirtualKeyboard";
import { useAudio } from "../hooks/useAudio";
import { useDosShell } from "../hooks/useDosShell";
import { useChipCommands } from "../hooks/useChipCommands";
import Pinball from "./Pinball";

interface ConsoleProps {
  newGame: () => void;
  runGame: (page: Page) => void;
}

export default function Console({ newGame, runGame: runPage }: ConsoleProps): JSX.Element {
  const { initAudio, beep } = useAudio();
  const [activeGame, setActiveGame] = useState<null | "pinball">(null);
  const handleRunGame = useCallback(
    (page: Page) => {
      if (page === "pinball") setActiveGame("pinball");
      else runPage(page);
    },
    [runPage]
  );
  const {
    renderWithCursor,
    lineBuffer,
    promptActive,
    cwd,
    nodeAtPath,
    boot,
    submit,
    setLine,
    handleChar,
    backspace,
    upHistory,
    downHistory,
    startPrompt,
  } = useDosShell(handleRunGame, beep, initAudio);

  const [powerOn, setPowerOn] = useState<boolean>(true);

  useEffect(() => {
    const t = setInterval(() => setPowerOn((p) => !p), 1200);
    return () => clearInterval(t);
  }, []);

  const runCommand = useCallback(
    (c: string) => {
      if (!promptActive) return;
      setLine(c);
      submit();
    },
    [promptActive, setLine, submit]
  );

  const { chipCommands } = useChipCommands({
    promptActive,
    cwd,
    nodeAtPath,
    setLine,
    runCommand,
  });

  const pinballChipCommands = useMemo(
    () => [
      { text: "", onPress: () => {} },
      { text: "", onPress: () => {} },
      { text: "", onPress: () => {} },
      { text: "", onPress: () => {} },
      {
        text: "EXIT",
        onPress: () => {
          setActiveGame(null);
          startPrompt();
        },
      },
    ],
    [startPrompt]
  );

  // ---------- Physical keyboard ----------
  useEffect(() => {
    if (activeGame) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) return;
      const fIdx = /^F([1-5])$/.exec(e.key);
      if (fIdx) {
        e.preventDefault();
        const idx = parseInt(fIdx[1], 10) - 1;
        chipCommands[idx]?.onPress();
        return;
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        backspace();
      } else if (e.key === "Enter") {
        e.preventDefault();
        submit();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        upHistory();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        downHistory();
      } else if (e.key === "Tab") {
        e.preventDefault();
        handleChar("    ");
      } else if (e.key.length === 1) {
        e.preventDefault();
        handleChar(e.key); // respects physical Shift
      }
    };
    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey as any);
  }, [activeGame, backspace, submit, upHistory, downHistory, handleChar, chipCommands]);

  // ---------- Boot sequence ----------
  useEffect(() => {
    boot(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Styles (unchanged from your CSS) ----------
  const css = `
  :root{
    --screen-bg:#001400;
    --phosphor:#00ff80;
    --phosphor-dim:#00b060;
    --bezel:#1a1a1a; --bezel-edge:#0a0a0a; --accent:#4dd17a;
    --btn:#151a16; --btn-edge:#0d100e; --btn-text:#d9ffe6;
    --led-off:#6b5f16; --led-on:#ffd84a;
  }
  html, body { height:100%; }
  body{
    margin:0; background:#53524f; color:#d9ffe6; font:14px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
    display:flex; flex-direction:column; gap:8px;
  }
  .wrap{ display:flex; flex-direction:column; width:100%; height:100%; }

  /* --- CRT Screen --- */
  .crt{
    position:relative; flex: 1 1 50%; min-height:40vh; max-height:60vh; margin:8px; border-radius:20px; overflow:hidden;
    border:8px solid var(--bezel); box-shadow:0 0 0 2px var(--bezel-edge) inset, 0 40px 80px rgba(0,0,0,.7), 0 12px 24px rgba(0,0,0,.8) inset;
    background:radial-gradient(120% 80% at 50% 50%, #001c00 0%, #000b00 75%);
  }
  .crt .inner{
    position:absolute; top: 14px; left: 14px; right: 14px; bottom: 38px; border-radius:12px; background: var(--screen-bg);
    box-shadow:0 0 0 2px rgba(0,0,0,.65) inset, 0 0 80px rgba(0,255,130,.06) inset, 0 0 220px rgba(0,200,100,.05) inset;
    overflow:auto; -webkit-overflow-scrolling:touch; filter:saturate(90%) contrast(110%) brightness(95%);
  }
  pre.screen{ margin:0; padding:16px 18px 40px; color:var(--phosphor); font-size:clamp(12px, 2.6vmin, 18px); text-shadow:0 0 6px rgba(0,255,130,.35), 0 0 18px rgba(0,255,100,.12);
    white-space:pre-wrap; word-wrap:break-word; }

  .function-keys {
    position: absolute; bottom: 14px; left: 14px; right: 14px; height: 24px; background: #002a00;
    color: var(--phosphor-dim); display: flex; align-items: center; padding: 0 18px; box-sizing: border-box;
    font-family: inherit; font-size: clamp(12px, 2.4vmin, 16px); white-space: nowrap; overflow: hidden; user-select: none;
  }
  .function-keys span { margin-right: 1.2em; }
  .function-keys .f-num { background: var(--phosphor-dim); color: #002a00; padding: 0 4px; margin-right: 4px; font-weight: normal; }

  .glass{ pointer-events:none; position:absolute; inset:0; border-radius:12px; background: linear-gradient(180deg, rgba(0,0,0,.15), rgba(0,0,0,.35)), radial-gradient(60% 90% at 50% 10%, rgba(255,255,255,.06), rgba(0,0,0,0) 60%), repeating-linear-gradient(to bottom, rgba(0,0,0,.05) 0, rgba(0,0,0,.05) 1px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 4px); mix-blend-mode:screen; animation:flicker 3.6s infinite; }
  @keyframes flicker{ 0%,19%,21%,23%,100%{opacity:.9;} 20%,22%{opacity:.72;} }
  .vignette{ position:absolute; inset:0; pointer-events:none; border-radius:12px; box-shadow: inset 0 0 120px rgba(0,0,0,.6), inset 0 0 300px rgba(0,0,0,.75); }
  .status{ position:absolute; right:18px; top:10px; font-size:12px; color:#a9ffcd; opacity:.75; text-shadow:0 0 10px rgba(0,255,120,.25); }

  /* --- Command chips --- */
  .kb{ flex:1 1 50%; min-height:38vh; margin:0 8px 10px; display:flex; flex-direction:column; gap:8px; }
  .bar{ display:grid; grid-template-columns:repeat(5,1fr); gap:8px; justify-content:center; }
  .chip{ background:linear-gradient(180deg, #555, #444); color:#dcdcdc; border:1px solid #333; border-bottom-color:#222; border-radius:6px; padding:8px 0; font-weight:normal; letter-spacing:.6px; box-shadow:0 3px 0 #2a2a2a, 0 0 0 2px #202020 inset; text-transform:uppercase; user-select:none; touch-action:manipulation; -webkit-tap-highlight-color:transparent; cursor:pointer; text-align:center; }
  .chip:active{ transform:translateY(1px); box-shadow:0 2px 0 #2a2a2a, 0 0 0 2px #202020 inset; }

  .pinball-overlay{ position:fixed; inset:0; background:#0b0f1a; display:flex; flex-direction:column; z-index:999; }
  .pinball-overlay .pinball-area{ flex:1 1 auto; display:flex; }
  .pinball-overlay .crt{ flex:1 1 auto; min-height:0; max-height:none; margin:8px; }
  .pinball-overlay .crt .inner{ overflow:hidden; }
  .pinball-overlay .bar{ margin:8px; }

  /* --- Keyboard --- */
  .rows{ display:flex; flex-direction:column; gap:6px; flex:1; }
  .row{ display:flex; gap:6px; justify-content:center; }
  .key{
    position:relative;
    flex:1 1 0; min-width:20px; padding:10px 0;
    background:linear-gradient(180deg, #555, #444);
    color:#dcdcdc; border:1px solid #333; border-bottom-color:#222; border-radius:6px;
    box-shadow:0 3px 0 #2a2a2a, 0 0 0 2px #202020 inset;
    text-align:center; user-select:none; touch-action:manipulation; -webkit-tap-highlight-color:transparent; cursor:pointer;
    display:flex; align-items:center; justify-content:center; transition: background .1s ease, color .1s ease;
  }
  .key:active{ transform:translateY(1px); box-shadow:0 2px 0 #2a2a2a, 0 0 0 2px #202020 inset; }
  .key .char-main { font-size: clamp(16px, 3.5vmin, 22px); }
  .key .char-sym { position:absolute; top:2px; right:5px; font-size:clamp(11px, 2vmin, 14px); color:#a0a0a0; opacity:.9; }
  .key.ctrl .char-main { font-size:clamp(11px, 2.5vmin, 14px); text-transform:uppercase; }
  .key.empty { opacity:0; pointer-events:none; }
  .key.ctrl.active { background: linear-gradient(180deg, #666, #555); color:#fff; }
  .key.ctrl .led {
    display:inline-block; width:8px; height:8px; border-radius:50%;
    position:absolute; right:5px; top:50%; transform:translateY(-50%);
    background:radial-gradient(circle at 35% 35%, var(--led-off) 0%, #3a320b 70%); box-shadow:0 0 0 1px rgba(0,0,0,.35) inset;
  }
  .key.ctrl.active .led {
    background:radial-gradient(circle at 35% 35%, var(--led-on) 0%, #9a7b17 75%); box-shadow:0 0 4px rgba(255,216,74,.4), 0 0 0 1px rgba(0,0,0,.35) inset;
  }

  @media (max-width: 420px){
    .crt .inner{ inset:10px; }
    .chip{ padding:6px 8px; border-radius:12px; }
    .rows { gap: 5px; }
    .row { gap: 5px; }
    .key { border-radius: 6px; }
  }
  `;

  return (
    <>
      <style>{css}</style>
      {activeGame === "pinball" && (
        <div className="pinball-overlay">
          <div className="pinball-area">
            <div className="crt">
              <div className="inner">
                <Pinball
                  onExit={() => {
                    setActiveGame(null);
                    startPrompt();
                  }}
                />
              </div>
              <div className="function-keys">
                {pinballChipCommands.map((c, i) => (
                  <span key={i}>
                    <b className="f-num">{`F${i + 1}`}</b>
                    {c.text}
                  </span>
                ))}
              </div>
              <div className="glass" />
              <div className="vignette" />
            </div>
          </div>
          <CommandChips chipCommands={pinballChipCommands} />
        </div>
      )}
      <div className="wrap">
        <div className="crt">
          <div className="inner">
            <ConsoleScreen>{renderWithCursor}</ConsoleScreen>
          </div>
          {!activeGame && (
            <div className="function-keys">
              {chipCommands.map((c, i) => (
                <span key={i}>
                  <b className="f-num">{`F${i + 1}`}</b>
                  {c.text}
                </span>
              ))}
            </div>
          )}
          <div className="glass" />
          <div className="vignette" />
          <div className="status">POWER {powerOn ? "◉" : "○"}</div>
        </div>

        <div className="kb">
          {!activeGame && (
            <>
              <CommandChips chipCommands={chipCommands} />

              <VirtualKeyboard
                onChar={handleChar}
                onBackspace={backspace}
                onEnter={submit}
                onUp={upHistory}
                onDown={downHistory}
                initAudio={initAudio}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
