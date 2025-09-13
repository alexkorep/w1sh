import { useMemo } from "react";
import CommandChips from "./CommandChips";
import Pinball from "../pages/Pinball";

interface PinballOverlayProps {
  onExit: () => void;
}

export default function PinballOverlay({ onExit }: PinballOverlayProps) {
  const pinballChipCommands = useMemo(
    () => [
      { text: "", onPress: () => {} },
      { text: "", onPress: () => {} },
      { text: "", onPress: () => {} },
      { text: "", onPress: () => {} },
      { text: "EXIT", onPress: onExit },
    ],
    [onExit]
  );

  return (
    <div className="pinball-overlay">
      <div className="pinball-area">
        <div className="crt">
          <div className="inner">
            <Pinball onExit={onExit} />
          </div>
          <div className="function-keys">
            {pinballChipCommands.map((c, i) => (
              <span key={i}>
                <b className="f-num">{`F${i + 1}`}</b>
                {c.text}
              </span>
            ))}
          </div>
          <div className="glass" />
          <div className="vignette" />
        </div>
      </div>
      <CommandChips chipCommands={pinballChipCommands} />
    </div>
  );
}
