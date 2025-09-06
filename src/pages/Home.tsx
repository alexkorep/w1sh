import { useEffect, useState, type MouseEvent } from "react";

interface HomeProps {
  onNewGame: () => void;
  onContinue: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function getUninstallInstructions(): string {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) {
    return "To uninstall: long-press the app icon and select Uninstall.";
  } else if (/iPhone|iPad/i.test(ua)) {
    return "To uninstall: long-press the app icon on your home screen and tap Remove App.";
  } else {
    return "To uninstall: click ⋮ in the title bar and choose 'Uninstall [App]'.";
  }
}

export default function Home({ onNewGame, onContinue }: HomeProps): JSX.Element {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isPwa, setIsPwa] = useState(false);

  useEffect(() => {
    const handler = (e: Event): void => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone;
    setIsPwa(standalone);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const requestFullscreen = async (): Promise<void> => {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      try {
        await el.requestFullscreen();
      } catch {
        // ignore fullscreen errors
      }
    }
  };

  const handleNewGame = async (e: MouseEvent): Promise<void> => {
    e.preventDefault();
    await requestFullscreen();
    onNewGame();
  };

  const handleContinue = async (e: MouseEvent): Promise<void> => {
    e.preventDefault();
    await requestFullscreen();
    onContinue();
  };

  const handleInstall = async (e: MouseEvent): Promise<void> => {
    e.preventDefault();
    if (isPwa) {
      alert(getUninstallInstructions());
    } else if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsPwa(true);
      }
      setDeferredPrompt(null);
    }
  };

  const css = `
  @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');

  /* --- Basic Setup & Resets --- */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body {
    height: 100%;
    width: 100%;
    overflow: hidden;
  }

  body {
    background-color: #050a05;
    color: #00ff41;
    font-family: 'VT323', monospace;
    text-transform: uppercase;
  }

  /* --- Main Terminal Container --- */
  .terminal-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    padding: 20px;
    position: relative;
  }

  /* --- CRT Screen Effects --- */
  .terminal-container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    /* Vignette to mimic curved screen */
    box-shadow: inset 0 0 10em 1em #000;
    pointer-events: none; /* Allows clicking through the overlay */
    z-index: 2;
  }

  .terminal-container::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    /* Scanlines effect */
    background-image: repeating-linear-gradient(
      transparent 0,
      rgba(0, 0, 0, 0.4) 1px,
      transparent 2px
    );
    background-size: 100% 3px;
    opacity: 0.8;
    pointer-events: none;
    z-index: 2;
    animation: flicker 0.15s infinite;
  }

  @keyframes flicker {
    0% { opacity: 0.75; }
    50% { opacity: 0.85; }
    100% { opacity: 0.75; }
  }

  /* --- Game Title --- */
  .game-title {
    font-size: 12vw; /* Responsive font size */
    font-weight: normal;
    letter-spacing: 0.5rem;
    text-shadow:
      0 0 5px #00ff41,
      0 0 10px #00ff41,
      0 0 20px #00ff41;
    margin-bottom: 2rem;
    position: relative;
  }

  /* Blinking cursor for the title */
  .cursor {
    display: inline-block;
    background-color: #00ff41;
    box-shadow: 0 0 10px #00ff41;
    /* Animation: blinks 5 times then stops */
    animation: blink 1s step-end 5;
  }

  @keyframes blink {
    from, to { background-color: transparent; box-shadow: none; }
    50% { background-color: #00ff41; box-shadow: 0 0 10px #00ff41; }
  }

  /* --- Navigation Menu --- */
  .menu {
    list-style: none;
    text-align: center;
  }

  .menu-item a {
    position: relative;
    display: inline-block;
    color: #00ff41;
    text-decoration: none;
    font-size: 5vw; /* Responsive font size */
    padding: 0.5rem 1rem;
    margin: 0.5rem 0;
    transition: all 0.2s ease-in-out;
    text-shadow: 0 0 5px #00ff41;
  }

  .menu-item a[aria-disabled="true"] {
    pointer-events: none;
    opacity: 0.5;
  }

  /* Hover effect: add a '>' prompt and increase glow */
  .menu-item a:hover {
    background-color: rgba(0, 255, 65, 0.1);
    text-shadow:
      0 0 5px #00ff41,
      0 0 15px #00ff41;
  }

  .menu-item a::before {
    content: '>';
    position: absolute;
    left: -1ch; /* ch unit is roughly the width of a character */
    opacity: 0;
    transition: opacity 0.2s ease-in-out;
  }

  .menu-item a:hover::before {
    opacity: 1;
  }

  /* --- Media Queries for Different Screen Sizes --- */
  @media (min-width: 768px) {
    .game-title {
      font-size: 7rem; /* Fixed size for larger screens */
    }
    .menu-item a {
      font-size: 2rem; /* Fixed size for larger screens */
    }
  }
  `;

  return (
    <div className="terminal-container">
      <style>{css}</style>
      <h1 className="game-title">
        W1SH<span className="cursor">█</span>
      </h1>
      <nav>
        <ul className="menu">
          <li className="menu-item">
            <a href="#" onClick={handleNewGame}>
              New Game
            </a>
          </li>
          <li className="menu-item">
            <a href="#" onClick={handleContinue}>
              Continue
            </a>
          </li>
          <li className="menu-item">
            <a
              href="#"
              onClick={handleInstall}
              aria-disabled={!isPwa && deferredPrompt === null}
            >
              {isPwa ? "Uninstall" : "Install"}
            </a>
          </li>
          <li className="menu-item">
            <a href="#">Options</a>
          </li>
        </ul>
      </nav>
    </div>
  );
}

