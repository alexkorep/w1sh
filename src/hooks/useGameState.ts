import { useEffect, useState } from "react";

export type Page = "ad" | "chat" | "console";

interface GameState {
  page: Page;
}

const STORAGE_KEY = "gameState";
const INITIAL_STATE: GameState = { page: "ad" };

function loadState(): GameState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as GameState;
      if (parsed.page) return parsed;
    }
  } catch {
    // ignore parsing errors and fall back to default
  }
  return INITIAL_STATE;
}

export default function useGameState() {
  const [state, setState] = useState<GameState>(() => loadState());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore write errors
    }
  }, [state]);

  const setPage = (page: Page): void => setState((prev) => ({ ...prev, page }));

  const onChatComplete = (): void => setPage("console");

  const resetGame = (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore remove errors
    }
    setState(INITIAL_STATE);
  };

  return { page: state.page, setPage, onChatComplete, resetGame };
}
