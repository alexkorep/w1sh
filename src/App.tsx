import "./App.css";
import AdPage from "./pages/AdPage";
import Chat from "./pages/Chat";
import Arrival from "./pages/Arrival";
import TitleScreen from "./pages/TitleScreen";
import Elite from "./pages/Elite";
import Pinball from "./pages/Pinball";
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
        <Pinball />
      ) : (
        <Console newGame={newGame} runGame={setPage} />
      )}
    </div>
  );
}

export default App;
