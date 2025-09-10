import { useEffect } from "react";
import type { ChipCommand } from "../hooks/useChipCommands";

interface CommandChipsProps {
  chipCommands: ChipCommand[];
}

export default function CommandChips({ chipCommands }: CommandChipsProps) {
  // Physical keyboard shortcuts for chips
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) return;
      const fIdx = /^F([1-5])$/.exec(e.key);
      if (fIdx) {
        e.preventDefault();
        const idx = parseInt(fIdx[1], 10) - 1;
        chipCommands[idx]?.onPress();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chipCommands]);

  return (
    <div className="bar">
      {chipCommands.map((c, i) => (
        <button key={i} className="chip" onClick={c.onPress} disabled={!c.text}>
          {`F${i + 1}`}
        </button>
      ))}
    </div>
  );
}
