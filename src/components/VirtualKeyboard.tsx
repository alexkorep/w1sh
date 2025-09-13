import { useState, useCallback } from "react";
import { UNIFIED_KEY_LAYOUT, type KeyDef } from "./virtualKeyboardLayout";

interface VirtualKeyboardProps {
  onChar: (char: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  onUp: () => void;
  onDown: () => void;
  initAudio: () => void;
}

export default function VirtualKeyboard({
  onChar,
  onBackspace,
  onEnter,
  onUp,
  onDown,
  initAudio,
}: VirtualKeyboardProps) {
  const [shift, setShift] = useState(false);
  const [sym, setSym] = useState(false);

  const pressKey = useCallback(
    (def: KeyDef) => {
      initAudio();
      const code = def.code || def.base;

      switch (code) {
        case "SHIFT":
          setShift((s) => {
            if (!s && sym) setSym(false);
            return !s;
          });
          break;
        case "SYM":
          setSym((s) => {
            if (!s && shift) setShift(false);
            return !s;
          });
          break;
        case "SPACE":
          onChar(" ");
          if (shift) setShift(false);
          break;
        case "ENTER":
          onEnter();
          if (shift) setShift(false);
          break;
        case "BKSP":
          onBackspace();
          break;
        case "UP":
          onUp();
          break;
        case "DN":
          onDown();
          break;
        default: {
          // character key
          let ch = def.base || "";
          if (sym && def.sym) ch = def.sym;
          else if (shift && def.shift) ch = def.shift;
          if (ch) onChar(ch);
          if (shift) setShift(false);
        }
      }
    },
    [onChar, onEnter, onBackspace, onUp, onDown, shift, sym, initAudio]
  );

  return (
    <div className="rows">
      {UNIFIED_KEY_LAYOUT.map((row, ri) => (
        <div className="row" key={ri}>
          {row.map((k, i) => {
            const isCtrl = !!k.ctrl;
            const isActive = (k.code === "SHIFT" && shift) || (k.code === "SYM" && sym);
            if (k.empty) {
              return <button className="key empty" key={i} style={{ flexGrow: k.size ?? 1 }} aria-hidden />;
            }
            return (
              <button
                key={i}
                className={`key${isCtrl ? " ctrl" : ""}${isActive ? " active" : ""}`}
                style={{ flexGrow: k.size ?? 1, flexBasis: 0 }}
                onClick={() => pressKey(k)}
              >
                <span className="char-main">{k.base}</span>
                {k.sym ? <span className="char-sym">{k.sym}</span> : null}
                {k.led ? <span className="led" /> : null}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
