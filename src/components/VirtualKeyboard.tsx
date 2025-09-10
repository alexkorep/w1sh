import { useMemo, useState, useCallback } from "react";

type KeyDef = {
  base?: string;
  shift?: string;
  sym?: string;
  code?: string;
  size?: number;
  ctrl?: boolean;
  led?: boolean;
  empty?: boolean;
};

const SPCR: KeyDef = { size: 0.5, empty: true };
const KEY_CONFIG = {
  SHIFT: { base: "⇧", code: "SHIFT", size: 1.5, ctrl: true, led: true },
  BKSP: { base: "⌫", code: "BKSP", size: 1.5, ctrl: true },
  SYM: { base: "123", code: "SYM", size: 1.5, ctrl: true, led: true },
  SPACE: { base: "space", code: "SPACE", size: 5, ctrl: true },
  ENTER: { base: "enter", code: "ENTER", size: 2.5, ctrl: true },
  UP: { base: "▲", code: "UP", ctrl: true },
  DN: { base: "▼", code: "DN", ctrl: true },
} as const;

const UNIFIED_KEY_LAYOUT: KeyDef[][] = [
  [
    { base: "q", shift: "Q", sym: "1" },
    { base: "w", shift: "W", sym: "2" },
    { base: "e", shift: "E", sym: "3" },
    { base: "r", shift: "R", sym: "4" },
    { base: "t", shift: "T", sym: "5" },
    { base: "y", shift: "Y", sym: "6" },
    { base: "u", shift: "U", sym: "7" },
    { base: "i", shift: "I", sym: "8" },
    { base: "o", shift: "O", sym: "9" },
    { base: "p", shift: "P", sym: "0" },
  ],
  [
    SPCR,
    { base: "a", shift: "A", sym: "@" },
    { base: "s", shift: "S", sym: "#" },
    { base: "d", shift: "D", sym: "$" },
    { base: "f", shift: "F", sym: "_" },
    { base: "g", shift: "G", sym: "&" },
    { base: "h", shift: "H", sym: "-" },
    { base: "j", shift: "J", sym: "+" },
    { base: "k", shift: "K", sym: "(" },
    { base: "l", shift: "L", sym: ")" },
    SPCR,
  ],
  [
    KEY_CONFIG.SHIFT,
    { base: "z", shift: "Z", sym: "*" },
    { base: "x", shift: "X", sym: '"' },
    { base: "c", shift: "C", sym: "'" },
    { base: "v", shift: "V", sym: ":" },
    { base: "b", shift: "B", sym: ";" },
    { base: "n", shift: "N", sym: "!" },
    { base: "m", shift: "M", sym: "?" },
    KEY_CONFIG.BKSP,
  ],
  [KEY_CONFIG.SYM, KEY_CONFIG.UP, KEY_CONFIG.DN, KEY_CONFIG.SPACE, KEY_CONFIG.ENTER],
];

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
