# AI Coding Agent Instructions

These guidelines capture the project-specific architecture and conventions for the `w1sh` Vite + React + TypeScript retro terminal game. Keep responses concise, implement surgically, and follow existing patterns.

## Big Picture
- Single-page React app bootstrapped by `src/main.tsx` → `<App/>` (no router; page flow is manual via `useGameState`).
- Game loop is narrative screens → in-console DOS-like simulation → launching mini-games (e.g. Pinball, Elite placeholder) through a simulated filesystem + commands.
- Core differentiator: a faux DOS shell implemented in `useDosShell.ts` with an in-memory virtual filesystem and timed boot sequence.
- Console UX layers: `Console.tsx` (composition + input handling), hooks (`useDosShell`, `useChipCommands`, `useAudio`), and UI components (`ConsoleScreen`, `CommandChips`, `VirtualKeyboard`).

## Key Directories & Roles
- `src/pages/` — Discrete high-level screens (AdPage, Chat, Arrival, TitleScreen, Elite, Pinball, Console, Home). Each self-contained; heavy inline CSS via `<style>` blocks is common/accepted.
- `src/hooks/` — Stateful encapsulations: game progression (`useGameState`), shell (`useDosShell`), UI affordances (`useChipCommands`), audio (`useAudio`). Avoid adding global context; prefer local hook state.
- `src/components/` — Presentational / interaction units used inside console (e.g., keyboard, screen, command chips).
- `public/` — Static assets, `sw.js` registered for PWA feel, `images/` referenced via `import.meta.env.BASE_URL`.

## Page / Flow Conventions
- Page switching is string-based: union `Page` type in `useGameState`. To add a page: extend the `Page` union, adjust `App.tsx` conditional chain, implement page component in `pages/`.
- New mini-game reachable from console: map an `.EXE` entry in virtual FS (`useDosShell` FS memo) to a `runGame(pageName)` path handled in `Console.tsx` and `App.tsx`.

## Virtual Filesystem & Shell
- FS declared inside `useDosShell` via helper factories `file()`, `dir()`, `app()`. Add new executable by adding `"NAME.EXE": app("TITLE","pageKey")` inside appropriate directory (commonly root `C:` or `GAMES`).
- Command execution pipeline: keyboard → line buffer (`lineBuffer`) → `submit()` → `exec()` switch. Extend by adding a case in `exec()` or integrating with existing `RUN` logic.
- Auto-run optimization: patterns like `RUN <APP>` auto-submit via effect watching `lineBuffer`.
- Printing: only mutate terminal text via `print` / `println` to preserve cursor and prompt formatting.
- Reboot / boot: use `boot(fromReboot:boolean)`; keep timing style (staggered `setTimeout`) if extending sequence.

## Command Chips Pattern
- `useChipCommands` dynamically maps F1–F5 buttons: default set (DIR, CLS, CD.., RUN, HELP) or RUN pagination mode.
- Adding chip-only helpers: extend default array in hook; keep at most 5 entries; blank fillers maintain layout.
- RUN mode expects `.EXE` names filtered from current directory where `FSNode.type === 'app'` and filename ends with `.EXE`.

## Input & UX Conventions
- Physical keyboard events handled in `Console.tsx`; respect early returns when a mini-game is active.
- Cursor rendering & blink logic is internal (`renderWithCursor`), do not manually append cursor glyph.
- Inline CSS-in-JS `<style>` blocks per page/component are acceptable; follow existing token variables for console theming when inside `Console.tsx`.

## Audio
- Lightweight square wave beeps via `useAudio`. Initialize audio context lazily (`initAudio`) before generating tones. Reuse existing `beep(freq, ms)` signature.

## Adding a New Mini-Game (Example)
1. Create `src/pages/MyGame.tsx` export default component.
2. Add to `Page` union (`useGameState.ts`).
3. Add conditional branch in `App.tsx` similar to `Pinball`.
4. Register executable in FS: e.g. `"MYGAME.EXE": app("MYGAME","mygame")`.
5. Handle in `runApp` (if needing print preface) or rely on `RUN MYGAME` discovering `.EXE`.
6. Optionally craft chip shortcut by adding `.EXE` in current dir so RUN mode lists it.

## Build & Dev
- Scripts: `npm run dev` (Vite), `npm run build` (TypeScript compile then Vite), `npm run preview` (serve build). No tests currently; avoid inventing a test harness unless requested.
- Service worker auto-registered on load for PWA-like caching; keep path relative to `import.meta.env.BASE_URL`.

## Style & Implementation Notes
- Avoid global state libs; keep additions local to hooks/components.
- Maintain small, pure hooks returning plain objects; avoid side effects outside existing patterns (intervals, timeouts, event listeners cleaned up in `useEffect`).
- Use `useCallback` / `useMemo` similarly to existing code to stabilize props passed to child components.
- Accept existing `// @ts-nocheck` in complex files rather than partial ad-hoc typing unless fully refactoring (ask first).

## Safe Changes Checklist
- When extending FS or commands: ensure prompt resumes via `startPrompt()` unless launching external page.
- When printing multi-frame animations: capture buffer anchor length pattern (see DEMO) to avoid uncontrolled growth.
- Do not mutate `buffer` directly; always via state setters or helpers.

## When Unsure
- Ask before large refactors (routing, state management, styling overhaul). Keep incremental.

---
Provide diffs only for changed files; keep edits minimal and in line with these conventions.
