import "./App.css";
import AdPage from "./pages/AdPage";
import Chat from "./pages/Chat";
import Console from "./pages/Console";
import useGameState from "./hooks/useGameState";

function App() {
  const { page, setPage, onChatComplete, resetGame } = useGameState();

  const handleNewGame = (): void => {
    if (window.confirm("Start a new game?")) {
      resetGame();
    }
  };

  let content: JSX.Element;
  if (page === "ad") {
    content = <AdPage onMessageSeller={() => setPage("chat")} />;
  } else if (page === "chat") {
    content = <Chat onComplete={onChatComplete} />;
  } else {
    content = <Console />;
  }

  return (
    <div className="app-container">
      <div className="app-content">{content}</div>
      <div className="toolbar">
        <button onClick={handleNewGame}>New Game</button>
      </div>
    </div>
  );
}

export default App;
