// @ts-nocheck
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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

export default function Console({
  newGame,
  runGame: runPage,
}: ConsoleProps): JSX.Element {
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
  }, [
    activeGame,
    backspace,
    submit,
    upHistory,
    downHistory,
    handleChar,
    chipCommands,
  ]);

  // ---------- Boot sequence ----------
  // Guard against React 18 StrictMode double-invoking effects in dev (which caused
  // duplicate timed boot messages like "Starting MS-DOS..." while initial sync lines
  // appeared once because the second invocation cleared and rewrote them).
  const bootedRef = useRef(false);
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    boot(false);
  }, [boot]);

  // ---------- Styles (unchanged from your CSS) ----------
  const css = `
  .console-page{
    --screen-bg:#001400;
    --phosphor:#00ff80;
    --phosphor-dim:#00b060;
    --bezel:#1a1a1a; --bezel-edge:#0a0a0a; --accent:#4dd17a;
    --btn:#151a16; --btn-edge:#0d100e; --btn-text:#d9ffe6;
    --led-off:#6b5f16; --led-on:#ffd84a;

    /* scale everything off the app container's size */
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
    font-size: calc(1.6 * var(--u)); /* baseline text */
    line-height: 1.4;

    margin:0; background:#53524f; color:#d9ffe6;
    display:flex; flex-direction:column; gap: calc(.9 * var(--u));
    width:100%; height:100%;
    box-sizing: border-box;
  }
  .console-page * { box-sizing: inherit; }
  .console-page .wrap{ display:flex; flex-direction:column; width:100%; height:100%; }

  /* --- CRT Screen --- */
  .crt{
    position:relative; flex:0 0 auto; aspect-ratio:4 / 3; width:100%; height:auto;
    margin: calc(.9 * var(--u)); border-radius: calc(2 * var(--u)); overflow:hidden;
    border: calc(.9 * var(--u)) solid var(--bezel);
    box-shadow:
      0 0 0 calc(.2 * var(--u)) var(--bezel-edge) inset,
      0 calc(4 * var(--u)) calc(8 * var(--u)) rgba(0,0,0,.7),
      0 calc(1.2 * var(--u)) calc(2.4 * var(--u)) rgba(0,0,0,.8) inset;
    background:radial-gradient(120% 80% at 50% 50%, #001c00 0%, #000b00 75%);
  }
  .crt .inner{
    position:absolute;
    top:  calc(1.6 * var(--u));
    left: calc(1.6 * var(--u));
    right: calc(1.6 * var(--u));
    bottom: calc(4.2 * var(--u));
    border-radius:calc(1.2 * var(--u));
    background: var(--screen-bg);
    box-shadow:
      0 0 0 calc(.22 * var(--u)) rgba(0,0,0,.65) inset,
      0 0 calc(8 * var(--u)) rgba(0,255,130,.06) inset,
      0 0 calc(22 * var(--u)) rgba(0,200,100,.05) inset;
    overflow:auto; -webkit-overflow-scrolling:touch;
    filter:saturate(90%) contrast(110%) brightness(95%);
  }

  pre.screen{
    margin:0;
    padding: calc(1.6 * var(--u)) calc(1.8 * var(--u)) calc(4 * var(--u));
    color:var(--phosphor);
    font-size: calc(1.9 * var(--u));
    text-shadow:0 0 calc(.6 * var(--u)) rgba(0,255,130,.35),
                0 0 calc(1.8 * var(--u)) rgba(0,255,100,.12);
    white-space:pre-wrap; word-wrap:break-word;
  }

  .function-keys {
    position: absolute;
    bottom:  calc(1.6 * var(--u));
    left:    calc(1.6 * var(--u));
    right:   calc(1.6 * var(--u));
    height:  calc(2.7 * var(--u));
    background: #002a00;
    color: var(--phosphor-dim);
    display: flex; align-items: center;
    padding: 0 calc(1.8 * var(--u));
    box-sizing: border-box;
    font-size: calc(1.7 * var(--u));
    white-space: nowrap; overflow: hidden; user-select: none;
  }
  .function-keys span { margin-right: calc(1.2 * var(--u)); }
  .function-keys .f-num {
    background: var(--phosphor-dim); color: #002a00;
    padding: 0 calc(.4 * var(--u)); margin-right: calc(.4 * var(--u));
    font-weight: normal;
  }

  .glass{
    pointer-events:none; position:absolute; inset:0; border-radius:calc(1.2 * var(--u));
    background:
      linear-gradient(180deg, rgba(0,0,0,.15), rgba(0,0,0,.35)),
      radial-gradient(60% 90% at 50% 10%, rgba(255,255,255,.06), rgba(0,0,0,0) 60%),
      repeating-linear-gradient(to bottom, rgba(0,0,0,.05) 0, rgba(0,0,0,.05) 1px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 4px);
    mix-blend-mode:screen; animation:flicker 3.6s infinite;
  }
  @keyframes flicker{ 0%,19%,21%,23%,100%{opacity:.9;} 20%,22%{opacity:.72;} }
  .vignette{ position:absolute; inset:0; pointer-events:none; border-radius:calc(1.2 * var(--u));
    box-shadow: inset 0 0 calc(12 * var(--u)) rgba(0,0,0,.6),
                inset 0 0 calc(30 * var(--u)) rgba(0,0,0,.75);
  }
  .status{
    position:absolute; right:calc(1.8 * var(--u)); top:calc(1 * var(--u));
    font-size: calc(1.3 * var(--u)); color:#a9ffcd; opacity:.75;
    text-shadow:0 0 calc(1 * var(--u)) rgba(0,255,120,.25);
  }

  /* --- Command chips --- */
  .kb{ flex:1 1 auto; margin:0 calc(.9 * var(--u)) calc(1.1 * var(--u));
       display:flex; flex-direction:column; gap:calc(.9 * var(--u)); min-height:0; }
  .bar{ display:grid; grid-template-columns:repeat(5,1fr); gap:calc(.9 * var(--u)); justify-content:center; }
  .chip{
    background:linear-gradient(180deg, #555, #444); color:#dcdcdc;
    border:1px solid #333; border-bottom-color:#222; border-radius:calc(.7 * var(--u));
    padding: calc(.9 * var(--u)) 0; font-weight:normal; letter-spacing:.06em;
    box-shadow:0 calc(.33 * var(--u)) 0 #2a2a2a, 0 0 0 calc(.22 * var(--u)) #202020 inset;
    text-transform:uppercase; user-select:none; touch-action:manipulation; -webkit-tap-highlight-color:transparent; cursor:pointer; text-align:center;
    font-size: calc(1.5 * var(--u));
  }
  .chip:active{ transform:translateY(calc(.12 * var(--u)));
    box-shadow:0 calc(.22 * var(--u)) 0 #2a2a2a, 0 0 0 calc(.22 * var(--u)) #202020 inset; }

  /* The overlay should scale with the app, not the viewport */
  .pinball-overlay{ position:absolute; inset:0; background:#0b0f1a; display:flex; flex-direction:column; z-index:999; }
  .pinball-overlay .pinball-area{ flex:1 1 auto; display:flex; }
  .pinball-overlay .crt{ flex:1 1 auto; aspect-ratio:auto; min-height:0; max-height:none; margin:calc(.9 * var(--u)); }
  .pinball-overlay .crt .inner{ overflow:hidden; }
  .pinball-overlay .bar{ margin:calc(.9 * var(--u)); }

  /* --- Keyboard --- */
  /* Virtual keyboard: make buttons roughly half previous height by constraining container */
  .rows{ display:flex; flex-direction:column; gap:calc(.6 * var(--u)); flex:0 0 25%; min-height:0; }
  .row{ display:flex; gap:calc(.6 * var(--u)); justify-content:center; flex:1 1 0; min-height:0; }
  .key{
    position:relative;
    flex:1 1 0; min-width:calc(2.2 * var(--u)); height:100%;
    padding:0;
    background:linear-gradient(180deg, #555, #444);
    color:#dcdcdc; border:1px solid #333; border-bottom-color:#222; border-radius:calc(.7 * var(--u));
    box-shadow:0 calc(.33 * var(--u)) 0 #2a2a2a, 0 0 0 calc(.22 * var(--u)) #202020 inset;
    text-align:center; user-select:none; touch-action:manipulation; -webkit-tap-highlight-color:transparent; cursor:pointer;
    display:flex; align-items:center; justify-content:center; transition: background .1s ease, color .1s ease;
    font-size: calc(1.6 * var(--u));
  }
  .key .char-main { line-height:1; font-size: calc(2.2 * var(--u)); }
  .key:active{ transform:translateY(calc(.12 * var(--u)));
    box-shadow:0 calc(.22 * var(--u)) 0 #2a2a2a, 0 0 0 calc(.22 * var(--u)) #202020 inset; }
  .key .char-sym { position:absolute; top:calc(.22 * var(--u)); right:calc(.55 * var(--u)); font-size:calc(1.3 * var(--u)); color:#a0a0a0; opacity:.9; }
  .key.ctrl .char-main { font-size:calc(1.4 * var(--u)); text-transform:uppercase; }
  .key.empty { opacity:0; pointer-events:none; }
  .key.ctrl.active { background: linear-gradient(180deg, #666, #555); color:#fff; }
  .key.ctrl .led {
    display:inline-block; width:calc(.9 * var(--u)); height:calc(.9 * var(--u)); border-radius:50%;
    position:absolute; right:calc(.55 * var(--u)); top:50%; transform:translateY(-50%);
    background:radial-gradient(circle at 35% 35%, var(--led-off) 0%, #3a320b 70%); box-shadow:0 0 0 1px rgba(0,0,0,.35) inset;
  }
  .key.ctrl.active .led {
    background:radial-gradient(circle at 35% 35%, var(--led-on) 0%, #9a7b17 75%); box-shadow:0 0 calc(.44 * var(--u)) rgba(255,216,74,.4), 0 0 0 1px rgba(0,0,0,.35) inset;
  }

  /* Container query tweaks for really small app sizes */
  @container app (inline-size <= 420px){
    .crt .inner{ inset: calc(1.1 * var(--u)); }
    .chip{ padding: calc(.7 * var(--u)) calc(.9 * var(--u)); border-radius: calc(1.2 * var(--u)); }
    .rows, .row { gap: calc(.5 * var(--u)); }
    .key { border-radius: calc(.7 * var(--u)); }
  }
  @container app (block-size <= 620px){
    .rows, .row { gap: calc(.45 * var(--u)); }
  }
  `;

  return (
    <div className="console-page">
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
    </div>
  );
}
