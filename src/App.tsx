import "./App.css";
import AdPage from "./pages/AdPage";
import Chat from "./pages/Chat";
import Arrival from "./pages/Arrival";
import Console from "./pages/Console";

import useGameState from "./hooks/useGameState";


function App() {
  const { page, setPage, onChatComplete, onArrivalComplete, newGame } = useGameState();

  return (
    <div className="app-container">
      {page === "ad" ? (
        <AdPage onMessageSeller={() => setPage("chat")} onBuyNow={() => setPage("arrival")} />
      ) : page === "chat" ? (
        <Chat onComplete={onChatComplete} />
      ) : page === "arrival" ? (
        <Arrival onComplete={onArrivalComplete} />
      ) : (
        <Console newGame={newGame} />
      )}
    </div>
  );
}

export default App;
