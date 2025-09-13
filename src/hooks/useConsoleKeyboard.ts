import { useEffect } from "react";

interface UseConsoleKeyboardOpts {
  activeGame: string | null;
  backspace: () => void;
  submit: () => void;
  upHistory: () => void;
  downHistory: () => void;
  handleChar: (ch: string) => void;
}

export function useConsoleKeyboard({
  activeGame,
  backspace,
  submit,
  upHistory,
  downHistory,
  handleChar,
}: UseConsoleKeyboardOpts) {
  useEffect(() => {
    if (activeGame) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) return;
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
        handleChar(e.key);
      }
    };
    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey as any);
  }, [activeGame, backspace, submit, upHistory, downHistory, handleChar]);
}

