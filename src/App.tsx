import './App.css'
import Chat from './pages/Chat'
import Console from './pages/Console'
import useGameState from './hooks/useGameState'

function App() {
  const { page } = useGameState()

  switch (page) {
    case 'console':
      return <Console />
    case 'chat':
    default:
      return <Chat />
  }
}

export default App
