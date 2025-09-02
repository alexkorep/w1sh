import "./App.css";
import Chat from "./pages/Chat";
import Console from "./pages/Console";
import useGameState from "./hooks/useGameState";

function App() {
  const { page, onChatComplete } = useGameState();

  return (
    <div className="app-container">
      {page === "console" ? <Console /> : <Chat onComplete={onChatComplete} />}
    </div>
  );
}

export default App;
