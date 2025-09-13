import { useEffect, useState } from "react";

export type Page =
  | "ad"
  | "chat"
  | "arrival"
  | "title"
  | "console"
  | "elite"
  | "pinball"
  | "tictactoe";

interface GameState {
  page: Page;
}

const STORAGE_KEY = "gameState";

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
  return { page: "ad" };
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

  const onChatComplete = (): void => setPage("arrival");

  const onArrivalComplete = (): void => setPage("title");

  const onTitleComplete = (): void => setPage("console");

  const newGame = (): void => setState({ page: "ad" });

  return {
    page: state.page,
    setPage,
    onChatComplete,
    onArrivalComplete,
    onTitleComplete,
    newGame,
  };
}
