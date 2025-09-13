// @ts-nocheck
import { useEffect, useState, useCallback } from "react";
import type { Page } from "../hooks/useGameState";
import ConsoleScreen from "../components/ConsoleScreen";
import CommandChips from "../components/CommandChips";
import VirtualKeyboard from "../components/VirtualKeyboard";
import PinballOverlay from "../components/PinballOverlay";
import { useAudio } from "../hooks/useAudio";
import { useDosShell } from "../hooks/useDosShell";
import { useChipCommands } from "../hooks/useChipCommands";
import { useConsoleKeyboard } from "../hooks/useConsoleKeyboard";
import { consoleStyles } from "./consoleStyles";

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

  useConsoleKeyboard({
    activeGame,
    backspace,
    submit,
    upHistory,
    downHistory,
    handleChar,
  });

  // ---------- Boot sequence ----------
  useEffect(() => {
    boot(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // styles defined in separate module

  return (
    <div className="console-page">
      <style>{consoleStyles}</style>
      {activeGame === "pinball" && (
        <PinballOverlay
          onExit={() => {
            setActiveGame(null);
            startPrompt();
          }}
        />
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
