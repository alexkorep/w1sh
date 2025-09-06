// ConsoleScreen.tsx
// @ts-nocheck
import { PropsWithChildren } from "react";

/**
 * Usage:
 * <ConsoleScreen>{textToShow}</ConsoleScreen>
 *
 * This component focuses on typography & colors only.
 * Place it inside your existing CRT container (with the glass/vignette, etc.).
 */
export default function ConsoleScreen({
  children,
  className = "",
}: PropsWithChildren<{ className?: string }>) {
  const css = `
  /* Inherit the same palette as your main console for consistency */
  :root{
    --screen-bg:#001400;
    --phosphor:#00ff80;
  }

  /* Local scope wrapper so styles can be co-located without leaking */
  .console-screen {
    width: 100%;
    height: 100%;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
    background: var(--screen-bg);
    /* a hint of CRT-ish glow can be added here if you render standalone */
    box-shadow:
      0 0 0 2px rgba(0,0,0,.65) inset,
      0 0 80px rgba(0,255,130,.06) inset,
      0 0 220px rgba(0,200,100,.05) inset;
    border-radius: 12px;
  }

  .console-screen pre.screen {
    margin: 0;
    padding: 16px 18px 40px;
    color: var(--phosphor);
    font: 14px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
    font-size: clamp(12px, 2.6vmin, 18px);
    white-space: pre-wrap;
    word-wrap: break-word;
    text-shadow:
      0 0 6px rgba(0,255,130,.35),
      0 0 18px rgba(0,255,100,.12);
  }

  /* Optional: subtle flicker if you want the text to breathe */
  @keyframes phosphorFlicker {
    0%, 22%, 24%, 100% { opacity: 1; }
    23% { opacity: .98; }
  }
  .console-screen pre.screen { animation: phosphorFlicker 3.6s infinite; }
  `;

  return (
    <div className={`console-screen ${className}`}>
      <style>{css}</style>
      <pre className="screen">{children}</pre>
    </div>
  );
}
