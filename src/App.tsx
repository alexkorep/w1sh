import "./App.css";
import AdPage from "./pages/AdPage";
import Chat from "./pages/Chat";
import Arrival from "./pages/Arrival";
import TitleScreen from "./pages/TitleScreen";
import Console from "./pages/Console";

import useGameState from "./hooks/useGameState";


function App() {
  const {
    page,
    setPage,
    onChatComplete,
    onArrivalComplete,
    onTitleComplete,
    newGame,
  } = useGameState();

  return (
    <div className="app-container">
      {page === "ad" ? (
        <AdPage onMessageSeller={() => setPage("chat")} />
      ) : page === "chat" ? (
        <Chat onComplete={onChatComplete} />
      ) : page === "arrival" ? (
        <Arrival onComplete={onArrivalComplete} />
      ) : page === "title" ? (
        <TitleScreen onBoot={onTitleComplete} />
      ) : (
        <Console newGame={newGame} />
      )}
    </div>
  );
}

export default App;
