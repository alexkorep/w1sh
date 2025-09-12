import { useCallback } from "react";

interface TitleScreenProps {
  onBoot: () => void;
}

export default function TitleScreen({ onBoot }: TitleScreenProps): JSX.Element {
  const handleBoot = useCallback(async () => {
    onBoot();
  }, [onBoot]);

  const css = `
  @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');

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

  .terminal-container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    box-shadow: inset 0 0 10em 1em #000;
    pointer-events: none;
    z-index: 2;
  }

  .terminal-container::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
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

  .arrival-image {
    width: 306px;
    height: 460px;
    object-fit: cover;
    margin-bottom: 2rem;
  }

  .boot-button {
    position: relative;
    display: inline-block;
    color: #00ff41;
    background: none;
    border: none;
    font-size: 5vw;
    padding: 0.5rem 1rem;
    margin: 0.5rem 0;
    transition: all 0.2s ease-in-out;
    text-shadow: 0 0 5px #00ff41;
    cursor: pointer;
  }

  .boot-button::before {
    content: '>';
    position: absolute;
    left: -1ch;
    opacity: 0;
    transition: opacity 0.2s ease-in-out;
  }

  .boot-button:hover {
    background-color: rgba(0, 255, 65, 0.1);
    text-shadow: 0 0 5px #00ff41, 0 0 15px #00ff41;
  }

  .boot-button:hover::before {
    opacity: 1;
  }

  @media (min-width: 768px) {
    .boot-button {
      font-size: 2rem;
    }
  }
  `;

  return (
    <div className="terminal-container">
      <style>{css}</style>
      <img
        src={`${import.meta.env.BASE_URL}images/arrival-device.jpg`}
        alt="Delivered device"
        className="arrival-image"
        width={306}
        height={460}
      />
      <button className="boot-button" onClick={handleBoot}>
        Boot it up!
      </button>
    </div>
  );
}
