# Agent Guide (w1sh)

Companion reference to `.github/copilot-instructions.md` focused on day‑to‑day AI assistant actions and safe extension patterns.

## Goal
Provide concise, surgical help adding narrative screens, DOS shell commands, virtual filesystem entries, and mini‑games without destabilizing existing flow.

## Core Flow Recap
1. Boot via narrative pages (`Page` union in `useGameState`).
2. Land in `Console` (retro DOS sim) powered by `useDosShell`.
3. Launch mini‑games / pages through virtual FS `.EXE` + `RUN <APP>` or direct commands.

## When Adding a Page
- Extend `Page` union in `useGameState.ts`.
- Add branch in `App.tsx` conditional chain (mirroring `pinball`/`elite`).
- Create component under `src/pages/`. Inline `<style>` allowed.
- If launchable from DOS: register in FS inside `useDosShell` via `"NAME.EXE": app("LABEL", "pageKey")`.

## Extending Virtual Filesystem
- Edit FS object in `useDosShell` (single `useMemo`). Keep structure shallow and descriptive.
- Use helpers: `file(content)`, `dir(children)`, `app(name, runKey)`.
- Text files: prefer CRLF endings (`\r\n`) to match existing style in system files.

## Adding / Modifying Commands
- Primary switch inside `exec()` of `useDosShell`.
- Keep command name uppercase in switch; accept user input case‑insensitively by uppercasing token before switch.
- After printing command output, always call `startPrompt()` unless intentionally transferring control (e.g., `runGame`, `REBOOT`).

## Printing & Animations
- Only mutate display via `print` / `println` helpers.
- For multi‑frame effects: capture `anchorLen = buffer.length` then overwrite tail each frame like DEMO to avoid runaway buffer growth.
- Do not append manual cursor; rely on `renderWithCursor`.

## Chip Commands (`useChipCommands`)
- Limit set to 5; blank fillers maintain grid.
- RUN mode paginates `.EXE` entries in current dir (4 + MORE). Changing pagination logic? Maintain backward compatibility of default chip order: `DIR | CLS | CD.. | RUN | HELP`.

## Audio Beeps
- Always call `initAudio()` before first `beep()` in a session (user gesture required). Frequency in Hz, default 880, duration ms.

## Mini‑Game Launch Pattern
1. Add FS executable (e.g., `PINBALL.EXE`).
2. In `runApp` (inside `useDosShell`), add case if pre‑launch text/animation needed. Otherwise rely on generic `RUN` path which finds `.EXE` and calls `runApp`.
3. In `Console.tsx`, intercept page key (e.g., set `activeGame`).
4. Provide exit path that calls `startPrompt()`.

## Service Worker Note
- Registered in `main.tsx` as `${import.meta.env.BASE_URL}sw.js`. Keep relative path stable when reorganizing public assets.

## Styling Conventions
- Heavy inline CSS in component scopes acceptable; prefer local variable reuse (see console theme tokens in `Console.tsx`).
- Avoid global stylesheet proliferation; add selectors within component `<style>` tags.

## Performance / Safety
- Preserve hook dependency arrays; changes must be intentional.
- Avoid introducing large libraries; current stack is minimal (React + Vite + TS only).
- Do not refactor to global state libraries without explicit instruction.

## Common Pitfalls
- Forgetting to call `startPrompt()` after new command output → shell appears frozen.
- Adding command that mutates `buffer` directly rather than via helpers.
- Introducing `.EXE` without matching `app(runKey)` handler path → `RUN` shows but cannot launch.
- Writing animations that append indefinitely → memory growth.

## Quick Reference
- Dev: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`

Keep changes atomic; submit diffs only for touched regions. Ask before broad structural shifts.
