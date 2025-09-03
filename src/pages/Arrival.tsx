import { useEffect, useState } from "react";

interface ArrivalProps {
  onComplete?: () => void;
}

export default function Arrival({ onComplete }: ArrivalProps): JSX.Element {
  const [showText, setShowText] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowText(true), 100); // fade in
    const t2 = setTimeout(() => setFadeOut(true), 2300); // start fade out
    const t3 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 3500); // after fade out
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  const css = `
  .arrival-screen {
    width: 100%;
    height: 100%;
    background: #000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #fff;
  }
  .arrival-text {
    font-size: 24px;
    opacity: 0;
    transition: opacity 1.2s ease-in-out;
  }
  .arrival-text.show {
    opacity: 1;
  }
  .arrival-text.fade {
    opacity: 0;
  }
  .arrival-image {
    margin-top: 20px;
    max-width: 80%;
  }
  `;

  return (
    <div className="arrival-screen">
      <style>{css}</style>
      <div
        className={`arrival-text ${showText ? "show" : ""} ${
          fadeOut ? "fade" : ""
        }`}
      >
        3 to 5 days later. Your package arrives.
      </div>
      <img
        src={`${import.meta.env.BASE_URL}images/arrival-device.jpg`}
        alt="Delivered device"
        className="arrival-image"
      />
    </div>
  );
}
