// @ts-nocheck
import { useState, useCallback, useMemo, useEffect } from "react";
import type { Page } from "./useGameState";

export type FSNode =
  | { type: "file"; content: string }
  | { type: "dir"; children: Record<string, FSNode> }
  | { type: "app"; name: string; run: string };

export function useDosShell(
  runGame: (page: Page) => void,
  beep: (freq?: number, ms?: number) => void,
  initAudio: () => void
) {
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

  // Auto-submit when a full RUN <APP> command is entered
  useEffect(() => {
    if (!promptActive) return;
    const m = /^RUN\s+(.+)$/.exec(lineBuffer.trim());
    if (!m) return;
    const prog = m[1].toUpperCase();
    const keyExe = prog + ".EXE";
    const here = nodeAtPath(cwd) as Record<string, FSNode>;
    const games = nodeAtPath(["C:", "GAMES"]) as Record<string, FSNode>;
    if (
      (here && here[keyExe] && here[keyExe].type === "app") ||
      (games && games[keyExe] && games[keyExe].type === "app")
    ) {
      submit();
    }
  }, [lineBuffer, promptActive, cwd, nodeAtPath, submit]);

  return {
    buffer,
    renderWithCursor,
    lineBuffer,
    promptActive,
    cwd,
    nodeAtPath,
    boot,
    submit,
    setLine,
    handleChar,
    backspace,
    upHistory,
    downHistory,
  };
}
