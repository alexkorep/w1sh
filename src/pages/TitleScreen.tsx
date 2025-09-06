import { useCallback } from "react";

interface TitleScreenProps {
  onBoot: () => void;
}

export default function TitleScreen({ onBoot }: TitleScreenProps): JSX.Element {
  const handleBoot = useCallback(async () => {
    onBoot();
  }, [onBoot]);

  const css = `
  .title-screen {
    width: 100%;
    height: 100%;
    background: #000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #fff;
  }
  .arrival-image {
    margin-top: 20px;
    max-width: 80%;
  }
  .boot-button {
    margin-top: 20px;
    padding: 10px 20px;
    background: #444;
    color: #fff;
    border: none;
    cursor: pointer;
  }
  `;

  return (
    <div className="title-screen">
      <style>{css}</style>
      <img
        src={`${import.meta.env.BASE_URL}images/arrival-device.jpg`}
        alt="Delivered device"
        className="arrival-image"
      />
      <button className="boot-button" onClick={handleBoot}>
        Boot it up!
      </button>
    </div>
  );
}
