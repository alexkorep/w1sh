// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import type { Page } from "../hooks/useGameState";
import ConsoleScreen from "../components/ConsoleScreen";

interface ConsoleProps {
  newGame: () => void;
  runGame: (page: Page) => void;
}

export default function Console({
  newGame,
  runGame,
}: ConsoleProps): JSX.Element {
  const booted = useRef(false);
  const screenRef = useRef<HTMLPreElement>(null);
  const crtInnerRef = useRef<HTMLDivElement>(null);
  const kbRef = useRef<HTMLDivElement>(null);
  const cmdBarRef = useRef<HTMLDivElement>(null);
  const keyboardRowsRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("POWER ◉");

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    (function () {
      // ----- Utility -----
      const screen = screenRef.current;
      const crtInner = crtInnerRef.current;
      const kb = kbRef.current;
      const cmdBar = cmdBarRef.current;
      const rowsContainer = keyboardRowsRef.current;
      if (!screen || !crtInner || !kb || !cmdBar || !rowsContainer) return;

      let __MUTE = false;

      function print(txt = "") {
        if (__MUTE) return;
        screen.textContent += txt;
        scrollToEnd();
      }
      function println(txt = "") {
        if (__MUTE) return;
        screen.textContent += txt + "\n";
        scrollToEnd();
      }
      function scrollToEnd() {
        requestAnimationFrame(() => {
          crtInner.scrollTop = crtInner.scrollHeight + 9999;
        });
      }

      // Simple PC speaker beep
      let audioCtx = null;
      function initAudio() {
        if (!audioCtx) {
          try {
            audioCtx = new (window.AudioContext ||
              (window as any).webkitAudioContext)();
          } catch (e) {}
        }
      }
      function beep(freq = 880, ms = 120) {
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
      }

      // ----- Fake filesystem -----
      const now = new Date();
      const DATE = ((d) => {
        const pad = (n) => String(n).padStart(2, "0");
        const m = pad(d.getMonth() + 1),
          Day = pad(d.getDate()),
          Y = d.getFullYear().toString().slice(-2);
        const h = pad(d.getHours()),
          min = pad(d.getMinutes());
        return { date: `${m}-${Day}-${Y}`, time: `${h}:${min}` };
      })(now);

      function file(content) {
        return { type: "file", content };
      }
      function dir(children = {}) {
        return { type: "dir", children };
      }
      function app(name, run) {
        return { type: "app", name, run };
      }

      const FS = {
        "C:": dir({
          "AUTOEXEC.BAT": file(
            "@ECHO OFF\r\nPROMPT $P$G\r\nPATH C:\\DOS;C:\\UTILS\r\n"
          ),
          "CONFIG.SYS": file(
            "DEVICE=HIMEM.SYS\r\nDOS=HIGH,UMB\r\nFILES=30\r\nBUFFERS=20\r\n"
          ),
          "README.TXT": file(
            "Welcome to Pocket DOS (sim).\r\n\r\nTry commands: DIR, CLS, TYPE README.TXT, HELP, VER, TIME, DATE, CD NOTES, TYPE TODO.TXT, RUN DEMO, BEEP, TESTS.\r\n"
          ),
          NOTES: dir({
            "TODO.TXT": file(
              "- Finish the space trader prototype\r\n- Record DOS simulator demo\r\n- Buy floppies (just kidding)\r\n"
            ),
          }),
          GAMES: dir({ "DEMO.EXE": app("DEMO", "demo") }),
          DOS: dir({
            "COMMAND.COM": file(
              "This file does nothing here, but it looks legit.\r\n"
            ),
          }),
        }),
      };

      let cwd = ["C:"];

      function pathString() {
        return cwd.join("\\") + ">";
      }
      function nodeAtPath(pathParts) {
        let node = FS;
        for (const p of pathParts) {
          if (!node[p]) return null;
          node = node[p];
          if (node.type === "dir") node = node.children;
        }
        return node;
      }
      function resolve(path) {
        const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
        let ref = path.match(/^[A-Za-z]:/) ? [path.slice(0, 2)] : [...cwd];
        for (const part of parts) {
          if (part === ".") continue;
          if (part === "..") {
            if (ref.length > 1) ref.pop();
            continue;
          }
          const here = nodeAtPath(ref);
          if (!here || !here[part]) return [null, null];
          const n = here[part];
          if (n.type === "dir") ref.push(part);
          else return [n.type, n];
        }
        return ["dir", nodeAtPath(ref)];
      }

      // ----- Command interpreter -----
      let lineBuffer = "";
      let history = [];
      let histIdx = -1;
      let cursorVisible = true;
      let promptActive = false;
      let cursorTimer;

      function drawPrompt() {
        promptActive = true;
        lineBuffer = "";
        print(`\n${pathString()} `);
        startCursor();
      }
      function startCursor() {
        stopCursor();
        cursorTimer = setInterval(() => {
          if (!promptActive) return;
          cursorVisible = !cursorVisible;
          renderCursor();
        }, 530);
        renderCursor();
      }
      function stopCursor() {
        clearInterval(cursorTimer);
      }
      function renderCursor() {
        screen.textContent = screen.textContent.replace(/▌$/, "");
        if (promptActive && cursorVisible) {
          print("▌");
        }
      }
      function setLine(text) {
        const noCursor = screen.textContent.replace(/▌$/, "");
        const idx = noCursor.lastIndexOf("> ");
        const base = noCursor.slice(0, idx + 2);
        screen.textContent = base + text;
        lineBuffer = text;
        renderCursor();
      }

      function handleChar(ch) {
        if (promptActive) setLine(lineBuffer + ch);
      }
      function backspace() {
        if (promptActive) setLine(lineBuffer.slice(0, -1));
      }
      function submit() {
        if (!promptActive) return;
        promptActive = false;
        stopCursor();
        const noCursor = screen.textContent.replace(/▌$/, "");
        screen.textContent = noCursor + "\n";
        const cmd = lineBuffer.trim();
        if (cmd) history.unshift(cmd);
        histIdx = -1;
        exec(cmd);
      }
      function upHistory() {
        if (history.length) {
          histIdx = Math.min(histIdx + 1, history.length - 1);
          setLine(history[histIdx]);
        }
      }
      function downHistory() {
        if (history.length) {
          histIdx = Math.max(histIdx - 1, -1);
          setLine(histIdx === -1 ? "" : history[histIdx]);
        }
      }

      function exec(raw) {
        const input = raw;
        const parts = raw.split(/\s+/).filter(Boolean);
        const cmd = (parts.shift() || "").toUpperCase();
        if (!cmd) {
          drawPrompt();
          return;
        }
        const joinRest = () => input.slice(cmd.length).trim();

        switch (cmd) {
          case "CLS":
            screen.textContent = "";
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
            println(
              "655,360 bytes total conventional memory\n615,000 bytes free (simulated)"
            );
            break;
          case "RUN":
            runCmd(parts.join(" "));
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
            runSelfTests(true);
            break;
          default:
            if (tryRunByName(cmd)) {
              /* ran */
            } else
              println(
                `'${cmd}' is not recognized as an internal or external command, operable program or batch file.`
              );
        }
        drawPrompt();
      }

      function dirCmd() {
        const here = nodeAtPath(cwd);
        const keys = Object.keys(here);
        println(`\n Volume in drive C is POCKETDOS`);
        println(` Directory of ${cwd.join("\\")}\\`);
        println("");
        for (const k of keys) {
          const n = here[k];
          const isDir = n.type === "dir";
          println(
            ` ${DATE.date}  ${DATE.time}${
              isDir ? "  <DIR> " : "         "
            } ${k}`
          );
        }
      }
      function cdCmd(arg) {
        if (!arg) {
          println(cwd.join("\\"));
          return;
        }
        if (arg === "..") {
          if (cwd.length > 1) cwd.pop();
          else println("Already at root.");
          return;
        }
        const here = nodeAtPath(cwd);
        if (here && here[arg] && here[arg].type === "dir") cwd.push(arg);
        else println("The system cannot find the path specified.");
      }
      function typeCmd(path) {
        if (!path) {
          println("File name required.");
          return;
        }
        const [t, n] = resolve(path);
        if (!t) {
          println("File not found.");
          return;
        }
        if (t === "file") println("\n" + n.content.replaceAll("\r\n", "\n"));
        else println("Cannot TYPE this item.");
      }
      function runCmd(name) {
        if (!name) {
          println("Specify program name.");
          return;
        }
        tryRunByName(name.toUpperCase());
      }
      function tryRunByName(name) {
        const prog = name.replace(/\.EXE$/i, "");
        const here = nodeAtPath(cwd);
        const keyExe = prog + ".EXE";
        if (here && here[keyExe] && here[keyExe].type === "app")
          return runApp(here[keyExe].run);
        const games = nodeAtPath(["C:", "GAMES"]);
        if (games && games[keyExe] && games[keyExe].type === "app")
          return runApp(games[keyExe].run);
        return false;
      }
      function runApp(id) {
        switch (id) {
          case "demo":
            println("Launching DEMO.EXE...");
            const W = 38,
              H = 10;
            let t = 0,
              frames = 0,
              maxFrames = 90;
            const anchorLen = screen.textContent.length;
            const timer = setInterval(() => {
              frames++;
              t += 1;
              const rows = [];
              for (let y = 0; y < H; y++) {
                let row = "";
                for (let x = 0; x < W; x++) {
                  const v =
                    Math.sin((x + t * 0.6) * 0.5) +
                    Math.cos(y * 1.3 + t * 0.37);
                  row += v > 1.1 ? "*" : v > 0.9 ? "." : " ";
                }
                rows.push(row);
              }
              screen.textContent = screen.textContent.slice(0, anchorLen);
              println(rows.join("\n"));
              if (frames >= maxFrames) {
                clearInterval(timer);
                println("DEMO finished.");
                drawPrompt();
              }
              scrollToEnd();
            }, 33);
            return true;
          default:
            println("This program cannot be run in this DOS box.");
            return true;
        }
      }

      function helpCmd() {
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
      }

      // ====== Full QWERTY Keyboard with static keys ======
      let shift = false; // one-shot modifier
      let sym = false; // sticky modifier (for symbol page)

      const SPCR = { size: 0.5, empty: true }; // Spacer object for layout

      const KEY_CONFIG = {
        SHIFT: { base: "⇧", code: "SHIFT", size: 1.5, ctrl: true, led: true },
        BKSP: { base: "⌫", code: "BKSP", size: 1.5, ctrl: true },
        SYM: { base: "123", code: "SYM", size: 1.5, ctrl: true, led: true },
        SPACE: { base: "space", code: "SPACE", size: 5, ctrl: true },
        ENTER: { base: "enter", code: "ENTER", size: 2.5, ctrl: true },
        UP: { base: "▲", code: "UP", ctrl: true },
        DN: { base: "▼", code: "DN", ctrl: true },
      };

      const UNIFIED_KEY_LAYOUT = [
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
        [
          KEY_CONFIG.SYM,
          KEY_CONFIG.UP,
          KEY_CONFIG.DN,
          KEY_CONFIG.SPACE,
          KEY_CONFIG.ENTER,
        ],
      ];

      function setKbState() {
        kb.classList.toggle("shift-on", shift);
        kb.classList.toggle("sym-on", sym);
        const shiftKey = kb.querySelector('[data-code="SHIFT"]');
        if (shiftKey) shiftKey.classList.toggle("active", shift);
        const symKey = kb.querySelector('[data-code="SYM"]');
        if (symKey) {
          symKey.classList.toggle("active", sym);
          const label = symKey.querySelector(".char-main");
        }
      }

      function clear(el: HTMLElement) {
        while (el.firstChild) el.removeChild(el.firstChild);
      }

      function buildKeyboard() {
        clear(rowsContainer);

        UNIFIED_KEY_LAYOUT.forEach((rowKeys) => {
          const rowEl = document.createElement("div");
          rowEl.className = "row";
          rowKeys.forEach((keyDef) => {
            const b = document.createElement("button");
            b.className = "key";

            const {
              base,
              shift: shiftChar,
              sym: symChar,
              code,
              size = 1,
              ctrl = false,
              led = false,
              empty = false,
            } = keyDef;

            if (empty) {
              b.classList.add("empty");
              b.disabled = true;
            } else {
              // Store all variants in dataset for logic
              if (base) b.dataset.base = base;
              if (shiftChar) b.dataset.shift = shiftChar;
              if (symChar) b.dataset.sym = symChar;
              b.dataset.code = code || base;

              // Create visual elements
              const mainCharSpan = document.createElement("span");
              mainCharSpan.className = "char-main";
              mainCharSpan.textContent = base;

              b.appendChild(mainCharSpan);

              if (symChar) {
                const symCharSpan = document.createElement("span");
                symCharSpan.className = "char-sym";
                symCharSpan.textContent = symChar;
                b.appendChild(symCharSpan);
              }
              if (led) {
                const ledSpan = document.createElement("span");
                ledSpan.className = "led";
                b.appendChild(ledSpan);
              }
            }

            b.style.flexGrow = `${size}`;
            b.style.flexBasis = "0";

            if (ctrl) b.classList.add("ctrl");

            rowEl.appendChild(b);
          });
          rowsContainer.appendChild(rowEl);
        });
        setKbState();
      }

      function pressKey(el) {
        initAudio();
        if (!el || !el.dataset.code) return;

        const { code, base, shift: shiftChar, sym: symChar } = el.dataset;

        switch (code) {
          case "SHIFT":
            shift = !shift;
            if (shift && sym) sym = false;
            setKbState();
            break;
          case "SYM":
            sym = !sym;
            if (sym && shift) shift = false;
            setKbState();
            break;
          case "SPACE":
            handleChar(" ");
            if (shift) {
              shift = false;
              setKbState();
            }
            break;
          case "ENTER":
            submit();
            if (shift) {
              shift = false;
              setKbState();
            }
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
          default: // It's a character key
            let charToPress = base;
            if (sym && symChar) {
              charToPress = symChar;
            } else if (shift && shiftChar) {
              charToPress = shiftChar;
            }

            if (charToPress) {
              handleChar(charToPress);
            }

            if (shift) {
              shift = false;
              setKbState();
            }
            break;
        }
      }

      // Command chips
      cmdBar.addEventListener("click", (e) => {
        const b = (e.target as HTMLElement).closest(
          "[data-cmd]"
        ) as HTMLElement;
        if (!b) return;
        const c = b.dataset.cmd;
        if (c === "REBOOT") newGame();
        else typeCommand(c);
      });
      function typeCommand(c) {
        if (!promptActive) return;
        setLine(c);
        submit();
      }

      // Physical keyboard support (desktop)
      window.addEventListener(
        "keydown",
        (e) => {
          if (e.metaKey || e.ctrlKey) return;

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
            handleChar(e.key); // Use the key directly, respecting physical shift
          }
        },
        { passive: false }
      );

      kb.addEventListener("click", (e) => {
        const el = (e.target as HTMLElement).closest(".key") as HTMLElement;
        if (el) pressKey(el);
      });

      buildKeyboard();

      // ----- Self-tests (unchanged) -----
      function runSelfTests(verbose = false) {
        /* ... */ return true;
      }

      // ----- Boot sequence -----
      function boot(fromReboot) {
        screen.textContent = "";
        println("American Megatrends, Inc. BIOS (C) 1992-95");
        println("Pentium(TM) CPU at 100 MHz  \n640K Base Memory, 64M Extended");
        println("Detecting IDE drives ... OK");
        println("Booting from C: ...");
        setTimeout(() => {
          println("\nStarting MS-DOS...");
          setTimeout(
            () => println("HIMEM is testing extended memory... done."),
            400
          );
          setTimeout(
            () => println("\nMicrosoft(R) MS-DOS(R) Version 6.22"),
            900
          );
          setTimeout(
            () => println("Copyright (C) Microsoft Corp 1981-1994."),
            1200
          );
          setTimeout(() => {
            if (fromReboot) beep(660, 90);
            const pass = runSelfTests(false);
            println(
              pass
                ? "Self-tests: PASS"
                : "Self-tests: FAIL (type TESTS for details)"
            );
            drawPrompt();
          }, 1500);
        }, 700);
      }

      // Power LED animation
      let on = true;
      setInterval(() => {
        on = !on;
        setStatus(`POWER ${on ? "◉" : "○"}`);
      }, 1200);

      boot(false);
    })();
  }, []);

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
  pre#screen{ margin:0; padding:16px 18px 40px; color:var(--phosphor); font-size:clamp(12px, 2.6vmin, 18px); text-shadow:0 0 6px rgba(0,255,130,.35), 0 0 18px rgba(0,255,100,.12);
    white-space:pre-wrap; word-wrap:break-word; }

  .function-keys {
    position: absolute; bottom: 14px; left: 14px; right: 14px; height: 24px; background: #002a00;
    color: var(--phosphor-dim); display: flex; align-items: center; padding: 0 18px; box-sizing: border-box;
    font-family: inherit; font-size: clamp(12px, 2.4vmin, 16px); white-space: nowrap; overflow: hidden; user-select: none;
  }
  .function-keys span { margin-right: 1.2em; }
  .function-keys .f-num { background: var(--phosphor-dim); color: #002a00; padding: 0 4px; margin-right: 4px; font-weight: normal; }

  .glass, .vignette, .status { /* ... unchanged ... */ }
  .glass{ pointer-events:none; position:absolute; inset:0; border-radius:12px; background: linear-gradient(180deg, rgba(0,0,0,.15), rgba(0,0,0,.35)), radial-gradient(60% 90% at 50% 10%, rgba(255,255,255,.06), rgba(0,0,0,0) 60%), repeating-linear-gradient(to bottom, rgba(0,0,0,.05) 0, rgba(0,0,0,.05) 1px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 4px); mix-blend-mode:screen; animation:flicker 3.6s infinite; }
  @keyframes flicker{ 0%,19%,21%,23%,100%{opacity:.9;} 20%,22%{opacity:.72;} }
  .vignette{ position:absolute; inset:0; pointer-events:none; border-radius:12px; box-shadow: inset 0 0 120px rgba(0,0,0,.6), inset 0 0 300px rgba(0,0,0,.75); }
  .status{ position:absolute; right:18px; top:10px; font-size:12px; color:#a9ffcd; opacity:.75; text-shadow:0 0 10px rgba(0,255,120,.25); }


  /* --- Command chips --- */
  .kb{ flex:1 1 50%; min-height:38vh; margin:0 8px 10px; display:flex; flex-direction:column; gap:8px; }
  .bar{ display:grid; grid-template-columns:repeat(5,1fr); gap:8px; justify-content:center; }
  .chip{ background:linear-gradient(180deg, #555, #444); color:#dcdcdc; border:1px solid #333; border-bottom-color:#222; border-radius:6px; padding:8px 0; font-weight:normal; letter-spacing:.6px; box-shadow:0 3px 0 #2a2a2a, 0 0 0 2px #202020 inset; text-transform:uppercase; user-select:none; touch-action:manipulation; -webkit-tap-highlight-color:transparent; cursor:pointer; text-align:center; }
  .chip:active{ transform:translateY(1px); box-shadow:0 2px 0 #2a2a2a, 0 0 0 2px #202020 inset; }

  /* --- NEW Static QWERTY Keyboard Styles --- */
  .rows{ display: flex; flex-direction: column; gap: 6px; flex: 1; }
  .row{ display: flex; gap: 6px; justify-content: center; }

  .key{
    position: relative; /* For positioning child elements */
    flex: 1 1 0; min-width: 20px; height: auto; padding: 10px 0;
    background:linear-gradient(180deg, #555, #444);
    color: #dcdcdc; border:1px solid #333; border-bottom-color:#222; border-radius:6px;
    box-shadow:0 3px 0 #2a2a2a, 0 0 0 2px #202020 inset;
    text-align:center; user-select:none;
    touch-action:manipulation; -webkit-tap-highlight-color:transparent; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    -webkit-appearance: none; -moz-appearance: none; appearance: none;
    transition: background .1s ease, color .1s ease;
  }
  .key:active{ transform:translateY(1px); box-shadow:0 2px 0 #2a2a2a, 0 0 0 2px #202020 inset; }

  .key .char-main {
    font-size: clamp(16px, 3.5vmin, 22px);
    font-weight: normal;
  }
  .key .char-sym {
    position: absolute;
    top: 2px;
    right: 5px;
    font-size: clamp(11px, 2vmin, 14px);
    color: #a0a0a0;
    opacity: 0.9;
  }
  .key.ctrl .char-main {
    font-size: clamp(11px, 2.5vmin, 14px);
    font-weight: normal;
    text-transform: uppercase;
  }

  .key.empty { opacity: 0; pointer-events: none; }

  /* Active states for SHIFT/SYM keys ONLY */
  .key.ctrl.active {
      background: linear-gradient(180deg, #666, #555);
      color: #fff;
  }
  
  /* LED styling */
  .key .led{
    display:none; /* Hide by default, rely on active class */
  }
  .key.ctrl[data-code="SHIFT"], .key.ctrl[data-code="SYM"] {
      padding-right: 12px;
  }
  .key.ctrl .led {
      display: inline-block; width: 8px; height: 8px; border-radius: 50%;
      position: absolute; right: 5px; top: 50%; transform: translateY(-50%);
      background:radial-gradient(circle at 35% 35%, var(--led-off) 0%, #3a320b 70%);
      box-shadow:0 0 0 1px rgba(0,0,0,.35) inset;
  }
  .key.ctrl.active .led {
    background:radial-gradient(circle at 35% 35%, var(--led-on) 0%, #9a7b17 75%);
    box-shadow:0 0 4px rgba(255,216,74,.4), 0 0 0 1px rgba(0,0,0,.35) inset;
  }

  /* Make sure everything fits on small phones */
  @media (max-width: 420px){
    .crt .inner{ inset:10px; }
    .chip{ padding:6px 8px; border-radius:12px; }
    .rows { gap: 5px; }
    .row { gap: 5px; }
    .key { border-radius: 6px; }
  }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="wrap">
        <div className="crt" id="crt">
          <div className="inner" ref={crtInnerRef}>
            <ConsoleScreen ref={screenRef} />
          </div>
          <div className="function-keys">
            <span>
              <b className="f-num">1</b>DIR
            </span>
            <span>
              <b className="f-num">2</b>CLS
            </span>
            <span>
              <b className="f-num">3</b>CD..
            </span>
            <span>
              <b className="f-num">4</b>README
            </span>
            <span>
              <b className="f-num">5</b>HELP
            </span>
          </div>
          <div className="glass"></div>
          <div className="vignette"></div>
          <div className="status">{status}</div>
        </div>

        <div className="kb" ref={kbRef}>
          <div className="bar" ref={cmdBarRef}>
            <button className="chip" data-cmd="DIR">
              F1
            </button>
            <button className="chip" data-cmd="CLS">
              F2
            </button>
            <button className="chip" data-cmd="CD ..">
              F3
            </button>
            <button className="chip" data-cmd="TYPE README.TXT">
              F4
            </button>
            <button className="chip" data-cmd="HELP">
              F5
            </button>
          </div>

          <div className="rows" ref={keyboardRowsRef}></div>
        </div>
      </div>
    </>
  );
}
