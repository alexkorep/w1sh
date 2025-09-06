// @ts-nocheck
import { useEffect, useRef } from "react";

interface ConsoleProps {
  newGame: () => void;
}

export default function Console({ newGame }: ConsoleProps): JSX.Element {
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    (function () {
      // ----- Utility -----
      const screen = document.getElementById("screen");
      const crtInner = document.querySelector(".crt .inner");
      const statusEl = document.getElementById("status");
      const kb = document.getElementById("kb");

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
        setTimeout(() => {
          o.stop();
        }, ms);
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
        if (!promptActive) return;
        setLine(lineBuffer + ch);
      }
      function backspace() {
        if (!promptActive) return;
        setLine(lineBuffer.slice(0, -1));
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
        if (history.length === 0) return;
        histIdx = Math.min(histIdx + 1, history.length - 1);
        setLine(history[histIdx]);
      }
      function downHistory() {
        if (history.length === 0) return;
        histIdx = Math.max(histIdx - 1, -1);
        setLine(histIdx === -1 ? "" : history[histIdx]);
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
            } else {
              println(
                `'${cmd}' is not recognized as an internal or external command, operable program or batch file.`
              );
            }
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
        if (here && here[arg] && here[arg].type === "dir") {
          cwd.push(arg);
        } else {
          println("The system cannot find the path specified.");
        }
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
        if (t === "file") {
          println("\n" + n.content.replaceAll("\r\n", "\n"));
        } else {
          println("Cannot TYPE this item.");
        }
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
        if (here && here[keyExe] && here[keyExe].type === "app") {
          return runApp(here[keyExe].run);
        }
        const games = nodeAtPath(["C:", "GAMES"]);
        if (games && games[keyExe] && games[keyExe].type === "app") {
          return runApp(games[keyExe].run);
        }
        return false;
      }
      function runApp(id) {
        switch (id) {
          case "demo":
            return demoApp();
          default:
            println("This program cannot be run in this DOS box.");
            return true;
        }
      }
      function demoApp() {
        println("Launching DEMO.EXE...");
        const W = 38,
          H = 10;
        let t = 0;
        let frames = 0;
        const maxFrames = 90;
        const anchorLen = screen.textContent.length;
        const timer = setInterval(() => {
          frames++;
          t += 1;
          const rows = [];
          for (let y = 0; y < H; y++) {
            let row = "";
            for (let x = 0; x < W; x++) {
              const v =
                Math.sin((x + t * 0.6) * 0.5) + Math.cos(y * 1.3 + t * 0.37);
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
        println(" BEEP              beep the PC speaker");
        println(" TESTS             run built-in self tests");
        println(" REBOOT            reboot the simulated PC");
        println(
          "\nTips: SHIFT toggles the lower glyph on rune-keys. MODE switches ABC/123."
        );
      }

      // ====== NEW: Rune keyboard ======
      const duoLayers = {
        letters: [
          ["QW", "ER", "TY", "UI", "OP"],
          ["AS", "DF", "GH", "JK", "L:"],
          ["ZX", "CV", "BN", "M.", "/-"],
        ],
        symbols: [
          ["12", "34", "56", "78", "90"],
          ["-\\", ":.", ",;", "()", "[]"],
          ["'\"", "+=", "/*", "/?", "&_"],
        ],
      };
      let layer: "letters" | "symbols" = "letters";
      let shift = false;

      function setKbState() {
        kb.classList.toggle("shift-on", shift);
        kb.setAttribute("data-layer", layer);
        const modeBtn = kb.querySelector(
          '[data-key="MODE"]'
        ) as HTMLButtonElement;
        if (modeBtn) modeBtn.textContent = layer === "letters" ? "123" : "ABC";
      }

      function makeCtrlKey(code: string, label: string) {
        const b = document.createElement("button");
        b.className = "key tiny ctrl";
        b.dataset.key = code;
        b.textContent = label;
        return b;
      }
      function makeDuo(pair: string) {
        const b = document.createElement("button");
        b.className = "key duo";
        b.dataset.pair = pair;
        b.innerHTML = `<span class="pair"><span class="top">${pair[0]}</span><span class="mid"></span><span class="bottom">${pair[1]}</span></span>`;
        return b;
      }

      function clear(el: HTMLElement) {
        while (el.firstChild) el.removeChild(el.firstChild);
      }

      function renderAlphaRows() {
        const r1 = document.getElementById("r1");
        const r2 = document.getElementById("r2");
        const r3 = document.getElementById("r3");
        clear(r1);
        clear(r2);
        clear(r3);
        const L = duoLayers[layer];
        for (const p of L[0]) r1.appendChild(makeDuo(p));
        for (const p of L[1]) r2.appendChild(makeDuo(p));
        for (const p of L[2]) r3.appendChild(makeDuo(p));
      }

      function buildKeyboard() {
        const r0 = document.getElementById("r0");
        const r4 = document.getElementById("r4");
        clear(r0);
        clear(r4);

        // Compact control strip
        r0.appendChild(makeCtrlKey("TAB", "TAB"));
        r0.appendChild(makeCtrlKey("BKSP", "BKSP"));
        r0.appendChild(makeCtrlKey("UP", "H↑"));
        r0.appendChild(makeCtrlKey("DN", "H↓"));
        r0.appendChild(makeCtrlKey("MODE", "123")); // toggles ABC/123

        renderAlphaRows();

        // Bottom row
        const bottom = [
          ["SHIFT", "SHIFT"],
          ["SPACE", "SPACE"],
          ["ENTER", "ENTER"],
        ];
        for (const [code, label] of bottom) {
          const b = document.createElement("button");
          b.className =
            "key " +
            (code === "SPACE" ? "xwide" : code === "SHIFT" ? "wide" : "");
          b.textContent = label;
          b.dataset.key = code;
          r4.appendChild(b);
        }
        setKbState();
      }

      function pressKey(code) {
        initAudio();
        if (code.length === 1) {
          handleChar(shift ? code : code.toLowerCase());
          if (shift) (shift = false), setKbState();
          return;
        }
        switch (code) {
          case "SHIFT":
            shift = !shift;
            setKbState();
            break;
          case "SPACE":
            handleChar(" ");
            break;
          case "TAB":
            handleChar("    ");
            break;
          case "ENTER":
            submit();
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
          case "MODE":
            layer = layer === "letters" ? "symbols" : "letters";
            renderAlphaRows();
            setKbState();
            break;
          default: /* noop */
        }
      }
      function pressDuo(pair) {
        const ch = shift ? pair[1] : pair[0];
        pressKey(ch);
      }

      // Command chips
      document.getElementById("cmdbar").addEventListener("click", (e) => {
        const b = (e.target as HTMLElement).closest(
          "[data-cmd]"
        ) as HTMLElement;
        if (!b) return;
        const c = b.dataset.cmd;
        if (c === "REBOOT") {
          newGame();
        } else {
          typeCommand(c);
        }
      });
      function typeCommand(c) {
        if (!promptActive) return;
        setLine(c);
        submit();
      }

      // Physical keyboard support
      window.addEventListener(
        "keydown",
        (e) => {
          if (e.key === "Backspace") {
            e.preventDefault();
            backspace();
            return;
          }
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            upHistory();
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            downHistory();
            return;
          }
          if (e.key === "Tab") {
            e.preventDefault();
            handleChar("    ");
            return;
          }
          if (e.key.length === 1) {
            handleChar(e.key.toUpperCase());
            return;
          }
        },
        { passive: false }
      );

      kb.addEventListener("click", (e) => {
        const b = (e.target as HTMLElement).closest(".key") as HTMLElement;
        if (!b) return;
        const pair = b.dataset.pair;
        if (pair) {
          pressDuo(pair);
          return;
        }
        const k = b.dataset.key;
        if (!k) return;
        pressKey(k);
      });

      buildKeyboard();

      // ----- Self-tests -----
      function runSelfTests(verbose = false) {
        const results = [];
        const ok = (name) => results.push({ name, pass: true });
        const fail = (name, err) =>
          results.push({ name, pass: false, err: String(err).slice(0, 140) });

        const saved = {
          text: screen.textContent,
          promptActive,
          lineBuffer,
          histIdx,
          history: history.slice(0),
        };
        stopCursor();
        try {
          try {
            if (typeof helpCmd !== "function")
              throw new Error("helpCmd missing");
            ok("helpCmd exists");
          } catch (e) {
            fail("helpCmd exists", e);
          }
          try {
            __MUTE = true;
            exec("HELP");
            ok("HELP executes");
          } catch (e) {
            fail("HELP executes", e);
          } finally {
            __MUTE = false;
          }
          try {
            __MUTE = true;
            dirCmd();
            typeCmd("README.TXT");
            ok("DIR/TYPE basic");
          } catch (e) {
            fail("DIR/TYPE basic", e);
          } finally {
            __MUTE = false;
          }
        } finally {
          screen.textContent = saved.text;
          promptActive = saved.promptActive;
          lineBuffer = saved.lineBuffer;
          histIdx = saved.histIdx;
          history = saved.history;
          if (promptActive) startCursor();
          else stopCursor();
          scrollToEnd();
        }

        const allPass = results.every((r) => r.pass);
        if (verbose) {
          println("\nSelf-tests results:");
          for (const r of results) {
            println(
              ` - ${r.name}: ${r.pass ? "OK" : "FAIL"}${
                r.err ? " — " + r.err : ""
              }`
            );
          }
          println(allPass ? "All tests passed." : "Some tests failed.");
        }
        return allPass;
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
          setTimeout(() => {
            println("HIMEM is testing extended memory... done.");
          }, 400);
          setTimeout(() => {
            println("\nMicrosoft(R) MS-DOS(R) Version 6.22");
          }, 900);
          setTimeout(() => {
            println("Copyright (C) Microsoft Corp 1981-1994.");
          }, 1200);
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
        statusEl.textContent = `POWER ${on ? "◉" : "○"}`;
      }, 1200);

      // Kick off
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
  }
  html, body { height:100%; }
  body{
    margin:0; background:#0c0f0c; color:#d9ffe6; font:14px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
    display:flex; flex-direction:column; gap:8px;
  }
  .wrap{ display:flex; flex-direction:column; width:100%; height:100%; }

  /* --- CRT Screen --- */
  .crt{
    position:relative; flex: 1 1 50%; min-height:45vh; max-height:60vh; margin:8px; border-radius:20px; overflow:hidden;
    border:8px solid var(--bezel); box-shadow:0 0 0 2px var(--bezel-edge) inset, 0 40px 80px rgba(0,0,0,.7), 0 12px 24px rgba(0,0,0,.8) inset;
    background:radial-gradient(120% 80% at 50% 50%, #001c00 0%, #000b00 75%);
  }
  .crt .inner{
    position:absolute; inset:14px; border-radius:12px; background: var(--screen-bg);
    box-shadow:0 0 0 2px rgba(0,0,0,.65) inset, 0 0 80px rgba(0,255,130,.06) inset, 0 0 220px rgba(0,200,100,.05) inset;
    overflow:auto; -webkit-overflow-scrolling:touch; filter:saturate(90%) contrast(110%) brightness(95%);
  }
  pre#screen{ margin:0; padding:16px 18px 40px; color:var(--phosphor); font-size:clamp(12px, 2.6vmin, 18px); text-shadow:0 0 6px rgba(0,255,130,.35), 0 0 18px rgba(0,255,100,.12);
    white-space:pre-wrap; word-wrap:break-word; }

  .glass{ pointer-events:none; position:absolute; inset:0; border-radius:12px;
    background: linear-gradient(180deg, rgba(0,0,0,.15), rgba(0,0,0,.35)),
                radial-gradient(60% 90% at 50% 10%, rgba(255,255,255,.06), rgba(0,0,0,0) 60%),
                repeating-linear-gradient(to bottom, rgba(0,0,0,.05) 0, rgba(0,0,0,.05) 1px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 4px);
    mix-blend-mode:screen; animation:flicker 3.6s infinite;
  }
  @keyframes flicker{ 0%,19%,21%,23%,100%{opacity:.9;} 20%,22%{opacity:.72;} }
  .vignette{ position:absolute; inset:0; pointer-events:none; border-radius:12px; box-shadow: inset 0 0 120px rgba(0,0,0,.6), inset 0 0 300px rgba(0,0,0,.75); }
  .status{ position:absolute; right:18px; top:10px; font-size:12px; color:#a9ffcd; opacity:.75; text-shadow:0 0 10px rgba(0,255,120,.25); }

  /* --- Command chips --- */
  .kb{ flex:1 1 50%; min-height:38vh; margin:0 8px 10px; display:flex; flex-direction:column; gap:8px; }
  .bar{ display:grid; grid-template-columns:repeat(5,1fr); gap:8px; justify-content:center; }
  .chip{
    background:linear-gradient(180deg,#103818,#0e2a15); color:var(--btn-text);
    border:1px solid #0b2a14; border-bottom-color:#071c0d; border-radius:14px; padding:8px 0;
    font-weight:600; letter-spacing:.6px; box-shadow:0 3px 0 #061a0c, 0 0 0 2px #031006 inset;
    text-transform:uppercase; user-select:none; touch-action:manipulation; -webkit-tap-highlight-color:transparent; cursor:pointer; text-align:center;
  }
  .chip:active{ transform:translateY(1px); box-shadow:0 2px 0 #061a0c, 0 0 0 2px #031006 inset; }

  /* --- Rune keyboard --- */
  .rows{ display:grid; grid-template-rows: repeat(5, 1fr); gap:8px; }
  .row{ display:grid; grid-template-columns:repeat(5,1fr); gap:6px; }
  .key{
    background:linear-gradient(180deg,#121612,#0a0e0a); color:#d8ffe8; border:1px solid #0e120f; border-bottom-color:#050806; border-radius:10px;
    font-size:clamp(14px, 2.6vmin, 18px);
    box-shadow:0 3.5px 0 #070b08, 0 0 0 2px #050805 inset; text-align:center; user-select:none;
    touch-action:manipulation; -webkit-tap-highlight-color:transparent; cursor:pointer;
  }
  .key:active{ transform:translateY(1px); box-shadow:0 2px 0 #070b08, 0 0 0 2px #050805 inset; }
  .key.wide{ grid-column:span 2; }
  .key.xwide{ grid-column:span 3; }
  .key.tiny{ font-size:clamp(12px, 2.2vmin, 16px); padding:10px 6px; }

  .key.duo{ display:grid; place-items:center; padding:10px 6px; }
  .key.duo .pair{ display:grid; grid-template-rows:auto 2px auto; align-items:center; gap:2px; }
  .key.duo .mid{ width:18px; height:2px; justify-self:center; background:rgba(77,209,122,.25); border-radius:2px; }
  .key.duo .top{ font-weight:700; letter-spacing:.6px; opacity:1; }
  .key.duo .bottom{ font-weight:600; letter-spacing:.6px; opacity:.35; }

  /* SHIFT highlight flips emphasis */
  .kb.shift-on .key.duo .top{ opacity:.35; }
  .kb.shift-on .key.duo .bottom{ opacity:1; }

  /* Make sure everything fits on small phones */
  @media (max-width: 420px){
    .crt .inner{ inset:10px; }
    .chip{ padding:6px 8px; border-radius:12px; }
    .key{ padding:12px 6px; }
    .key.tiny{ padding:8px 4px; }
  }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="wrap">
        <div className="crt" id="crt">
          <div className="inner">
            <pre id="screen"></pre>
          </div>
          <div className="glass"></div>
          <div className="vignette"></div>
          <div className="status" id="status">
            POWER ◉
          </div>
        </div>

        <div className="kb" id="kb" data-layer="letters">
          <div className="bar" id="cmdbar">
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
            <button className="chip" data-cmd="RUN DEMO">
              F6
            </button>
            <button className="chip" data-cmd="BEEP">
              F7
            </button>
            <button className="chip" data-cmd="REBOOT">
              F8
            </button>
            <button className="chip" data-cmd="F9">
              F9
            </button>
            <button className="chip" data-cmd="F10">
              F10
            </button>
          </div>

          <div className="rows">
            <div className="row" id="r0"></div>
            {/* control strip */}
            <div className="row" id="r1"></div>
            {/* duo row 1 */}
            <div className="row" id="r2"></div>
            {/* duo row 2 */}
            <div className="row" id="r3"></div>
            {/* duo row 3 */}
            <div className="row" id="r4"></div>
            {/* SHIFT / SPACE / ENTER */}
          </div>
        </div>
      </div>
    </>
  );
}
