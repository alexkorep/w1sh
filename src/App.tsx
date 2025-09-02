import "./App.css";
import AdPage from "./pages/AdPage";
import Chat from "./pages/Chat";
import Console from "./pages/Console";
import useGameState from "./hooks/useGameState";

function App() {
  const { page, setPage, onChatComplete } = useGameState();

  return (
    <div className="app-container">
      {page === "ad" ? (
        <AdPage onMessageSeller={() => setPage("chat")} />
      ) : page === "chat" ? (
        <Chat onComplete={onChatComplete} />
      ) : (
        <Console />
      )}
    </div>
  );
}

export default App;
