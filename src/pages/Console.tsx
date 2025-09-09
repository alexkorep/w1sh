// @ts-nocheck
import { useEffect, useMemo, useState, useCallback } from "react";
import type { Page } from "../hooks/useGameState";
import ConsoleScreen from "../components/ConsoleScreen";

interface ConsoleProps {
  newGame: () => void;
  runGame: (page: Page) => void;
}

type FSNode =
  | { type: "file"; content: string }
  | { type: "dir"; children: Record<string, FSNode> }
  | { type: "app"; name: string; run: string };

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

type ChipCommand = { text: string; onPress: () => void };

export default function Console({ newGame, runGame }: ConsoleProps): JSX.Element {
  // ---------- Audio (no refs) ----------
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);
  const initAudio = useCallback(() => {
    if (!audioCtx) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioCtx(ctx);
      } catch { }
    }
  }, [audioCtx]);
  const beep = useCallback(
    (freq = 880, ms = 120) => {
      if (!audioCtx) return;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "square";
      o.frequency.value = freq;
      g.gain.value = 0.06;
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start();
      setTimeout(() => o.stop(), ms);
    },
    [audioCtx]
  );

  // ---------- Date “ROM” ----------
  const DATE = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const m = pad(now.getMonth() + 1);
    const d = pad(now.getDate());
    const Y = now.getFullYear().toString().slice(-2);
    const h = pad(now.getHours());
    const min = pad(now.getMinutes());
    return { date: `${m}-${d}-${Y}`, time: `${h}:${min}` };
  }, []);

  // ---------- Fake filesystem ----------
  const FS = useMemo<Record<string, FSNode>>(
    () => ({
      "C:": dir({
        "AUTOEXEC.BAT": file("@ECHO OFF\r\nPROMPT $P$G\r\nPATH C:\\DOS;C:\\UTILS\r\n"),
        "CONFIG.SYS": file("DEVICE=HIMEM.SYS\r\nDOS=HIGH,UMB\r\nFILES=30\r\nBUFFERS=20\r\n"),
        "README.TXT": file(
          "Welcome to Pocket DOS (sim).\r\n\r\nTry commands: DIR, CLS, TYPE README.TXT, HELP, VER, TIME, DATE, CD NOTES, TYPE TODO.TXT, RUN DEMO, BEEP, TESTS.\r\n"
        ),
        "ELITE.EXE": app("ELITE", "elite"),
        "PINBALL.EXE": app("PINBALL", "pinball"),
        NOTES: dir({
          "TODO.TXT": file(
            "- Finish the space trader prototype\r\n- Record DOS simulator demo\r\n- Buy floppies (just kidding)\r\n"
          ),
        }),
        GAMES: dir({ "DEMO.EXE": app("DEMO", "demo") }),
        DOS: dir({
          "COMMAND.COM": file("This file does nothing here, but it looks legit.\r\n"),
        }),
      }),
    }),
    []
  );

  function file(content: string): FSNode {
    return { type: "file", content };
  }
  function dir(children: Record<string, FSNode> = {}): FSNode {
    return { type: "dir", children };
  }
  function app(name: string, run: string): FSNode {
    return { type: "app", name, run };
  }

  // ---------- Shell state ----------
  const [buffer, setBuffer] = useState<string>("");
  const [cwd, setCwd] = useState<string[]>(["C:"]);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number>(-1);
  const [promptActive, setPromptActive] = useState<boolean>(false);
  const [lineBuffer, setLineBuffer] = useState<string>("");
  const [cursorVisible, setCursorVisible] = useState<boolean>(true);
  const [powerOn, setPowerOn] = useState<boolean>(true);

  // ---------- Helpers bound to state ----------
  const pathString = useCallback(() => cwd.join("\\") + ">", [cwd]);

  const nodeAtPath = useCallback(
    (pathParts: string[]): Record<string, FSNode> | FSNode | null => {
      let node: any = FS;
      for (const p of pathParts) {
        if (!node[p]) return null;
        node = node[p];
        if (node.type === "dir") node = node.children;
      }
      return node;
    },
    [FS]
  );

  const resolve = useCallback(
    (path: string): ["file" | "dir" | null, FSNode | null] => {
      const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
      let ref = path.match(/^[A-Za-z]:/) ? [path.slice(0, 2)] : [...cwd];
      for (const part of parts) {
        if (part === ".") continue;
        if (part === "..") {
          if (ref.length > 1) ref.pop();
          continue;
        }
        const here = nodeAtPath(ref) as Record<string, FSNode> | null;
        if (!here || !here[part]) return [null, null];
        const n = here[part];
        if (n.type === "dir") ref.push(part);
        else return [n.type, n];
      }
      return ["dir", nodeAtPath(ref) as any];
    },
    [cwd, nodeAtPath]
  );

  // ---------- Printing ----------
  const print = useCallback((txt = "") => setBuffer((b) => b + txt), []);
  const println = useCallback((txt = "") => setBuffer((b) => b + txt + "\n"), []);

  // ---------- Cursor blink ----------
  useEffect(() => {
    if (!promptActive) return;
    const t = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(t);
  }, [promptActive]);

  // ---------- Power LED blink ----------
  useEffect(() => {
    const t = setInterval(() => setPowerOn((p) => !p), 1200);
    return () => clearInterval(t);
  }, []);

  // ---------- Prompt & line editing ----------
  const renderWithCursor = useMemo(() => {
    if (!promptActive) return buffer.replace(/▌$/, "");
    const noCursor = buffer.replace(/▌$/, "");
    return noCursor + (cursorVisible ? "▌" : "");
  }, [buffer, promptActive, cursorVisible]);

  const startPrompt = useCallback(() => {
    setPromptActive(true);
    setLineBuffer("");
    print(`\n${pathString()} `);
  }, [pathString, print]);

  const setLine = useCallback(
    (text: string) => {
      // replace last "> " line content in buffer
      setBuffer((prev) => {
        const noCursor = prev.replace(/▌$/, "");
        const idx = noCursor.lastIndexOf("> ");
        const base = idx >= 0 ? noCursor.slice(0, idx + 2) : noCursor;
        return base + text;
      });
      setLineBuffer(text);
    },
    []
  );

  const handleChar = useCallback(
    (ch: string) => {
      if (promptActive) setLine(lineBuffer + ch);
    },
    [promptActive, lineBuffer, setLine]
  );

  const backspace = useCallback(() => {
    if (!promptActive) return;
    setLine(lineBuffer.slice(0, -1));
  }, [promptActive, lineBuffer, setLine]);

  const upHistory = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      setHistIdx((idx) => {
        const n = Math.min(idx + 1, h.length - 1);
        setLine(h[n]);
        return n;
      });
      return h;
    });
  }, [setLine]);

  const downHistory = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      setHistIdx((idx) => {
        const n = Math.max(idx - 1, -1);
        setLine(n === -1 ? "" : h[n]);
        return n;
      });
      return h;
    });
  }, [setLine]);

  // ---------- Commands ----------
  const dirCmd = useCallback(() => {
    const here = nodeAtPath(cwd) as Record<string, FSNode>;
    const keys = Object.keys(here || {});
    println(`\n Volume in drive C is POCKETDOS`);
    println(` Directory of ${cwd.join("\\")}\\`);
    println("");
    for (const k of keys) {
      const n = here[k];
      const isDir = (n as any).type === "dir";
      println(` ${DATE.date}  ${DATE.time}${isDir ? "  <DIR> " : "         "} ${k}`);
    }
  }, [cwd, nodeAtPath, println, DATE.date, DATE.time]);

  const cdCmd = useCallback(
    (arg?: string) => {
      if (!arg) {
        println(cwd.join("\\"));
        return;
      }
      if (arg === "..") {
        setCwd((c) => (c.length > 1 ? c.slice(0, -1) : c));
        if (cwd.length <= 1) println("Already at root.");
        return;
      }
      const here = nodeAtPath(cwd) as Record<string, FSNode>;
      if (here && here[arg] && here[arg].type === "dir") {
        setCwd((c) => [...c, arg]);
      } else {
        println("The system cannot find the path specified.");
      }
    },
    [cwd, nodeAtPath, println]
  );

  const typeCmd = useCallback(
    (p?: string) => {
      if (!p) {
        println("File name required.");
        return;
      }
      const [t, n] = resolve(p);
      if (!t || !n) {
        println("File not found.");
        return;
      }
      if (t === "file") println("\n" + (n as any).content.replaceAll("\r\n", "\n"));
      else println("Cannot TYPE this item.");
    },
    [println, resolve]
  );

  const helpCmd = useCallback(() => {
    println("\nPOCKET DOS (sim) Help");
    println("----------------------");
    println(" DIR                list files and folders");
    println(' CD <DIR>          change directory  (use "CD .." to go up)');
    println(" TYPE <FILE>       print a text file");
    println(" ECHO <TEXT>       output text");
    println(" CLS               clear screen");
    println(" VER | DATE | TIME | MEM");
    println(" RUN <NAME>        run a program (e.g., RUN DEMO)");
    println(" ELITE             play Elite demo");
    println(" PINBALL           play pinball game");
    println(" BEEP              beep the PC speaker");
    println(" TESTS             run built-in self tests");
    println(" REBOOT            reboot the simulated PC");
  }, [println]);

  const runApp = useCallback(
    (id: string) => {
      switch (id) {
        case "demo": {
          println("Launching DEMO.EXE...");
          const W = 38,
            H = 10;
          let t = 0,
            frames = 0,
            maxFrames = 90;
          const anchorLen = (buffer || "").length;

          const timer = setInterval(() => {
            frames++;
            t += 1;
            const rows: string[] = [];
            for (let y = 0; y < H; y++) {
              let row = "";
              for (let x = 0; x < W; x++) {
                const v = Math.sin((x + t * 0.6) * 0.5) + Math.cos(y * 1.3 + t * 0.37);
                row += v > 1.1 ? "*" : v > 0.9 ? "." : " ";
              }
              rows.push(row);
            }
            setBuffer((b) => {
              const base = b.slice(0, anchorLen);
              return base + rows.join("\n") + "\n";
            });
            if (frames >= maxFrames) {
              clearInterval(timer);
              println("DEMO finished.");
              startPrompt();
            }
          }, 33);
          return true;
        }
        case "elite":
          println("Launching ELITE.EXE...");
          runGame("elite");
          return true;
        case "pinball":
          println("Launching PINBALL.EXE...");
          runGame("pinball");
          return true;
        default:
          println("This program cannot be run in this DOS box.");
          return true;
      }
    },
    [println, buffer, startPrompt, runGame]
  );

  const tryRunByName = useCallback(
    (name: string) => {
      const prog = name.replace(/\.EXE$/i, "");
      const here = nodeAtPath(cwd) as Record<string, FSNode>;
      const keyExe = prog + ".EXE";
      if (here && here[keyExe] && here[keyExe].type === "app") return runApp((here[keyExe] as any).run);
      const games = nodeAtPath(["C:", "GAMES"]) as Record<string, FSNode>;
      if (games && games[keyExe] && games[keyExe].type === "app") return runApp((games[keyExe] as any).run);
      return false;
    },
    [cwd, nodeAtPath, runApp]
  );

  const exec = useCallback(
    (raw: string) => {
      const input = raw;
      const parts = raw.split(/\s+/).filter(Boolean);
      const cmd = (parts.shift() || "").toUpperCase();
      if (!cmd) {
        startPrompt();
        return;
      }
      const joinRest = () => input.slice(cmd.length).trim();

      switch (cmd) {
        case "CLS":
          setBuffer("");
          break;
        case "DIR":
          dirCmd();
          break;
        case "CD":
          cdCmd(parts[0]);
          break;
        case "TYPE":
          typeCmd(joinRest());
          break;
        case "ECHO":
          println(joinRest());
          break;
        case "HELP":
          helpCmd();
          break;
        case "VER":
          println("MS-DOS Version 6.22 (sim)");
          break;
        case "TIME":
          println(`Current time: ${DATE.time}`);
          break;
        case "DATE":
          println(`Current date: ${DATE.date}`);
          break;
        case "MEM":
          println("655,360 bytes total conventional memory\n615,000 bytes free (simulated)");
          break;
        case "RUN":
          if (parts.length === 0) println("Specify program name.");
          else tryRunByName(parts.join(" ").toUpperCase());
          break;
        case "ELITE":
          runGame("elite");
          return;
        case "PINBALL":
          runGame("pinball");
          return;
        case "BEEP":
          initAudio();
          beep(880, 120);
          println("Beep!");
          break;
        case "REBOOT":
          boot(true);
          return;
        case "TESTS":
          // placeholder for tests
          println("Self-tests: PASS");
          break;
        default:
          if (!tryRunByName(cmd)) {
            println(`'${cmd}' is not recognized as an internal or external command, operable program or batch file.`);
          }
      }
      startPrompt();
    },
    [
      startPrompt,
      dirCmd,
      cdCmd,
      typeCmd,
      println,
      helpCmd,
      DATE.time,
      DATE.date,
      runGame,
      initAudio,
      beep,
      tryRunByName,
    ]
  );

  const submit = useCallback(() => {
    if (!promptActive) return;
    setPromptActive(false);
    setBuffer((b) => b.replace(/▌$/, "") + "\n");
    const cmd = lineBuffer.trim();
    if (cmd) setHistory((h) => [cmd, ...h]);
    setHistIdx(-1);
    exec(cmd);
  }, [promptActive, lineBuffer, exec]);

  // ---------- Keyboard: layout + handlers ----------
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

  const UNIFIED_KEY_LAYOUT: KeyDef[][] = useMemo(
    () => [
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
    ],
    []
  );

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
          handleChar(" ");
          if (shift) setShift(false);
          break;
        case "ENTER":
          submit();
          if (shift) setShift(false);
          break;
        case "BKSP":
          backspace();
          break;
        case "UP":
          upHistory();
          break;
        case "DN":
          downHistory();
          break;
        default: {
          // character key
          let ch = def.base || "";
          if (sym && def.sym) ch = def.sym;
          else if (shift && def.shift) ch = def.shift;
          if (ch) handleChar(ch);
          if (shift) setShift(false);
        }
      }
    },
    [handleChar, submit, backspace, upHistory, downHistory, shift, sym, initAudio]
  );

  // ---------- Command chips ----------
  const runCommand = useCallback(
    (c: string) => {
      if (!promptActive) return;
      setLine(c);
      submit();
    },
    [promptActive, setLine, submit]
  );

  const [chipMode, setChipMode] = useState<"default" | "run">("default");
  const [exeList, setExeList] = useState<string[]>([]);
  const [exePage, setExePage] = useState(0);

  const exitRunMode = useCallback(() => {
    setChipMode("default");
    setExeList([]);
    setExePage(0);
  }, []);

  const startRunMode = useCallback(() => {
    if (!promptActive) return;
    setLine("RUN ");
    const here = nodeAtPath(cwd) as Record<string, FSNode>;
    const exes = Object.keys(here)
      .filter((k) => here[k].type === "app" && /\.EXE$/i.test(k))
      .sort();
    setExeList(exes);
    setExePage(0);
    setChipMode("run");
  }, [promptActive, setLine, nodeAtPath, cwd]);

  const chipCommands = useMemo<ChipCommand[]>(() => {
    if (chipMode === "run") {
      const start = exePage * 4;
      const slice = exeList.slice(start, start + 4);
      const chips: ChipCommand[] = slice.map((exe) => ({
        text: exe,
        onPress: () => {
          setLine(`RUN ${exe}`);
          exitRunMode();
        },
      }));
      if (exeList.length > start + 4) {
        chips.push({ text: "MORE", onPress: () => setExePage((p) => p + 1) });
      }
      while (chips.length < 5) chips.push({ text: "", onPress: () => {} });
      return chips;
    }
    return [
      { text: "DIR", onPress: () => runCommand("DIR") },
      { text: "CLS", onPress: () => runCommand("CLS") },
      { text: "CD..", onPress: () => runCommand("CD ..") },
      { text: "RUN", onPress: startRunMode },
      { text: "HELP", onPress: () => runCommand("HELP") },
    ];
  }, [chipMode, exeList, exePage, runCommand, startRunMode, exitRunMode, setLine]);

  // ---------- Physical keyboard ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) return;
      const fIdx = /^F([1-5])$/.exec(e.key);
      if (fIdx) {
        e.preventDefault();
        const idx = parseInt(fIdx[1], 10) - 1;
        chipCommands[idx]?.onPress();
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        backspace();
      } else if (e.key === "Enter") {
        e.preventDefault();
        submit();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        upHistory();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        downHistory();
      } else if (e.key === "Tab") {
        e.preventDefault();
        handleChar("    ");
      } else if (e.key.length === 1) {
        e.preventDefault();
        handleChar(e.key); // respects physical Shift
      }
    };
    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey as any);
  }, [backspace, submit, upHistory, downHistory, handleChar, chipCommands]);

  // ---------- Boot sequence ----------
  const boot = useCallback(
    (fromReboot: boolean) => {
      setBuffer("");
      println("American Megatrends, Inc. BIOS (C) 1992-95");
      println("Pentium(TM) CPU at 100 MHz  \n640K Base Memory, 64M Extended");
      println("Detecting IDE drives ... OK");
      println("Booting from C: ...");
      setTimeout(() => {
        println("\nStarting MS-DOS...");
        setTimeout(() => println("HIMEM is testing extended memory... done."), 400);
        setTimeout(() => println("\nMicrosoft(R) MS-DOS(R) Version 6.22"), 900);
        setTimeout(() => println("Copyright (C) Microsoft Corp 1981-1994."), 1200);
        setTimeout(() => {
          if (fromReboot) {
            initAudio();
            beep(660, 90);
          }
          println("Self-tests: PASS");
          startPrompt();
        }, 1500);
      }, 700);
    },
    [println, startPrompt, initAudio, beep]
  );

  useEffect(() => {
    boot(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Styles (unchanged from your CSS) ----------
  const css = `
  :root{
    --screen-bg:#001400;
    --phosphor:#00ff80;
    --phosphor-dim:#00b060;
    --bezel:#1a1a1a; --bezel-edge:#0a0a0a; --accent:#4dd17a;
    --btn:#151a16; --btn-edge:#0d100e; --btn-text:#d9ffe6;
    --led-off:#6b5f16; --led-on:#ffd84a;
  }
  html, body { height:100%; }
  body{
    margin:0; background:#53524f; color:#d9ffe6; font:14px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
    display:flex; flex-direction:column; gap:8px;
  }
  .wrap{ display:flex; flex-direction:column; width:100%; height:100%; }

  /* --- CRT Screen --- */
  .crt{
    position:relative; flex: 1 1 50%; min-height:40vh; max-height:60vh; margin:8px; border-radius:20px; overflow:hidden;
    border:8px solid var(--bezel); box-shadow:0 0 0 2px var(--bezel-edge) inset, 0 40px 80px rgba(0,0,0,.7), 0 12px 24px rgba(0,0,0,.8) inset;
    background:radial-gradient(120% 80% at 50% 50%, #001c00 0%, #000b00 75%);
  }
  .crt .inner{
    position:absolute; top: 14px; left: 14px; right: 14px; bottom: 38px; border-radius:12px; background: var(--screen-bg);
    box-shadow:0 0 0 2px rgba(0,0,0,.65) inset, 0 0 80px rgba(0,255,130,.06) inset, 0 0 220px rgba(0,200,100,.05) inset;
    overflow:auto; -webkit-overflow-scrolling:touch; filter:saturate(90%) contrast(110%) brightness(95%);
  }
  pre.screen{ margin:0; padding:16px 18px 40px; color:var(--phosphor); font-size:clamp(12px, 2.6vmin, 18px); text-shadow:0 0 6px rgba(0,255,130,.35), 0 0 18px rgba(0,255,100,.12);
    white-space:pre-wrap; word-wrap:break-word; }

  .function-keys {
    position: absolute; bottom: 14px; left: 14px; right: 14px; height: 24px; background: #002a00;
    color: var(--phosphor-dim); display: flex; align-items: center; padding: 0 18px; box-sizing: border-box;
    font-family: inherit; font-size: clamp(12px, 2.4vmin, 16px); white-space: nowrap; overflow: hidden; user-select: none;
  }
  .function-keys span { margin-right: 1.2em; }
  .function-keys .f-num { background: var(--phosphor-dim); color: #002a00; padding: 0 4px; margin-right: 4px; font-weight: normal; }

  .glass{ pointer-events:none; position:absolute; inset:0; border-radius:12px; background: linear-gradient(180deg, rgba(0,0,0,.15), rgba(0,0,0,.35)), radial-gradient(60% 90% at 50% 10%, rgba(255,255,255,.06), rgba(0,0,0,0) 60%), repeating-linear-gradient(to bottom, rgba(0,0,0,.05) 0, rgba(0,0,0,.05) 1px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 4px); mix-blend-mode:screen; animation:flicker 3.6s infinite; }
  @keyframes flicker{ 0%,19%,21%,23%,100%{opacity:.9;} 20%,22%{opacity:.72;} }
  .vignette{ position:absolute; inset:0; pointer-events:none; border-radius:12px; box-shadow: inset 0 0 120px rgba(0,0,0,.6), inset 0 0 300px rgba(0,0,0,.75); }
  .status{ position:absolute; right:18px; top:10px; font-size:12px; color:#a9ffcd; opacity:.75; text-shadow:0 0 10px rgba(0,255,120,.25); }

  /* --- Command chips --- */
  .kb{ flex:1 1 50%; min-height:38vh; margin:0 8px 10px; display:flex; flex-direction:column; gap:8px; }
  .bar{ display:grid; grid-template-columns:repeat(5,1fr); gap:8px; justify-content:center; }
  .chip{ background:linear-gradient(180deg, #555, #444); color:#dcdcdc; border:1px solid #333; border-bottom-color:#222; border-radius:6px; padding:8px 0; font-weight:normal; letter-spacing:.6px; box-shadow:0 3px 0 #2a2a2a, 0 0 0 2px #202020 inset; text-transform:uppercase; user-select:none; touch-action:manipulation; -webkit-tap-highlight-color:transparent; cursor:pointer; text-align:center; }
  .chip:active{ transform:translateY(1px); box-shadow:0 2px 0 #2a2a2a, 0 0 0 2px #202020 inset; }

  /* --- Keyboard --- */
  .rows{ display:flex; flex-direction:column; gap:6px; flex:1; }
  .row{ display:flex; gap:6px; justify-content:center; }
  .key{
    position:relative;
    flex:1 1 0; min-width:20px; padding:10px 0;
    background:linear-gradient(180deg, #555, #444);
    color:#dcdcdc; border:1px solid #333; border-bottom-color:#222; border-radius:6px;
    box-shadow:0 3px 0 #2a2a2a, 0 0 0 2px #202020 inset;
    text-align:center; user-select:none; touch-action:manipulation; -webkit-tap-highlight-color:transparent; cursor:pointer;
    display:flex; align-items:center; justify-content:center; transition: background .1s ease, color .1s ease;
  }
  .key:active{ transform:translateY(1px); box-shadow:0 2px 0 #2a2a2a, 0 0 0 2px #202020 inset; }
  .key .char-main { font-size: clamp(16px, 3.5vmin, 22px); }
  .key .char-sym { position:absolute; top:2px; right:5px; font-size:clamp(11px, 2vmin, 14px); color:#a0a0a0; opacity:.9; }
  .key.ctrl .char-main { font-size:clamp(11px, 2.5vmin, 14px); text-transform:uppercase; }
  .key.empty { opacity:0; pointer-events:none; }
  .key.ctrl.active { background: linear-gradient(180deg, #666, #555); color:#fff; }
  .key.ctrl .led {
    display:inline-block; width:8px; height:8px; border-radius:50%;
    position:absolute; right:5px; top:50%; transform:translateY(-50%);
    background:radial-gradient(circle at 35% 35%, var(--led-off) 0%, #3a320b 70%); box-shadow:0 0 0 1px rgba(0,0,0,.35) inset;
  }
  .key.ctrl.active .led {
    background:radial-gradient(circle at 35% 35%, var(--led-on) 0%, #9a7b17 75%); box-shadow:0 0 4px rgba(255,216,74,.4), 0 0 0 1px rgba(0,0,0,.35) inset;
  }

  @media (max-width: 420px){
    .crt .inner{ inset:10px; }
    .chip{ padding:6px 8px; border-radius:12px; }
    .rows { gap: 5px; }
    .row { gap: 5px; }
    .key { border-radius: 6px; }
  }
  `;

  console.log('renderWithCursor', renderWithCursor);

  return (
    <>
      <style>{css}</style>
      <div className="wrap">
        <div className="crt">
          <div className="inner">
            {/* If your ConsoleScreen accepts children, this will work. Otherwise replace with <pre className="screen">{renderWithCursor}</pre> */}
            <ConsoleScreen>{renderWithCursor}</ConsoleScreen>
          </div>
          <div className="function-keys">
            {chipCommands.map((c, i) => (
              <span key={i}>
                <b className="f-num">{i + 1}</b>
                {c.text}
              </span>
            ))}
          </div>
          <div className="glass" />
          <div className="vignette" />
          <div className="status">POWER {powerOn ? "◉" : "○"}</div>
        </div>

        <div className="kb">
          <div className="bar">
            {chipCommands.map((c, i) => (
              <button key={i} className="chip" onClick={c.onPress} disabled={!c.text}>
                {c.text || ""}
              </button>
            ))}
          </div>

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
        </div>
      </div>
    </>
  );
}
