import { useEffect, useState } from "react";
import "./App.css";
import AdPage from "./pages/AdPage";
import Chat from "./pages/Chat";
import Arrival from "./pages/Arrival";
import TitleScreen from "./pages/TitleScreen";
import Elite from "./pages/Elite";
import Pinball from "./pages/Pinball";
import Console from "./pages/Console";
import Home from "./pages/Home";

import useGameState from "./hooks/useGameState";


function App() {
  const [showHome, setShowHome] = useState(true);
  const {
    page,
    setPage,
    onChatComplete,
    onArrivalComplete,
    onTitleComplete,
    newGame,
  } = useGameState();

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setShowHome(true);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const startNewGame = () => {
    newGame();
    setShowHome(false);
  };

  const continueGame = () => {
    setShowHome(false);
  };

  return (
    <div className="app-container">
      {showHome ? (
        <Home onNewGame={startNewGame} onContinue={continueGame} />
      ) : page === "ad" ? (
        <AdPage
          onMessageSeller={() => setPage("chat")}
          onBuyNow={() => setPage("arrival")}
        />
      ) : page === "chat" ? (
        <Chat onComplete={onChatComplete} />
      ) : page === "arrival" ? (
        <Arrival onComplete={onArrivalComplete} />
      ) : page === "title" ? (
        <TitleScreen onBoot={onTitleComplete} />
      ) : page === "elite" ? (
        <Elite />
      ) : page === "pinball" ? (
        <Pinball setPage={setPage} />
      ) : (
        <Console newGame={newGame} runGame={setPage} />
      )}
    </div>
  );
}

export default App;
