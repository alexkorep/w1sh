// @ts-nocheck
import React, { useMemo } from "react";

export type TerminalThemeName =
  | "classic"
  | "amber"
  | "matrix"
  | "ice"
  | "violet";

export type TerminalTheme = {
  bg: string;
  fg: string;
  accent: string;
};

const THEMES: Record<TerminalThemeName, TerminalTheme> = {
  classic: { bg: "#0b0f10", fg: "#b6d1c9", accent: "#4bd3b6" },
  amber: { bg: "#0c0a00", fg: "#ffbf66", accent: "#ff9900" },
  matrix: { bg: "#030604", fg: "#9cff9c", accent: "#20ff6c" },
  ice: { bg: "#05070a", fg: "#b6d7ff", accent: "#7cc4ff" },
  violet: { bg: "#0b0610", fg: "#e2c8ff", accent: "#b280ff" },
};

export type CursorSpec = {
  row: number;
  col: number;
  char?: string;
  blink?: boolean;
};

export type TerminalScreenProps = {
  cols: number;
  rows: number;
  content?: string | string[];
  cellWidth?: number;
  cellHeight?: number;
  gap?: number;
  theme?: TerminalThemeName | TerminalTheme;
  border?: boolean;
  glow?: boolean;
  scanlines?: boolean;
  cursor?: CursorSpec;
  className?: string;
  ariaLabel?: string;
};

function resolveTheme(theme?: TerminalThemeName | TerminalTheme): TerminalTheme {
  if (!theme) return THEMES.classic;
  if (typeof theme === "string") return THEMES[theme] ?? THEMES.classic;
  return theme;
}

function wrapToLines(input: string, cols: number, rows: number): string[] {
  const out: string[] = [];
  const pushLine = (line: string) => {
    out.push(line.padEnd(cols, " ").slice(0, cols));
  };

  const paragraphs = input.split(/\n/);
  for (let p = 0; p < paragraphs.length; p++) {
    let words = paragraphs[p].split(/(\s+)/).filter((w) => w.length > 0);
    let line = "";
    while (words.length) {
      const w = words.shift()!;
      if (/^\s+$/.test(w)) {
        if ((line + w).length <= cols) {
          line += w;
        } else {
          pushLine(line.trimEnd());
          line = "";
        }
        continue;
      }
      if (w.length > cols) {
        let start = 0;
        while (start < w.length) {
          const slice = w.slice(start, start + (cols - line.length));
          if (slice.length === cols - line.length) {
            pushLine((line + slice).slice(0, cols));
            line = "";
          } else {
            line += slice;
          }
          start += slice.length;
        }
      } else if ((line + w).length <= cols) {
        line += w;
      } else {
        pushLine(line.trimEnd());
        line = w;
      }
    }
    pushLine(line.trimEnd());
  }

  const lines = out.slice(-rows);
  while (lines.length < rows) lines.push(" ".repeat(cols));
  return lines;
}

function normalizeContent(
  content: TerminalScreenProps["content"],
  cols: number,
  rows: number
): string[] {
  if (Array.isArray(content)) {
    const lines = content.slice(-rows).map((ln) => ln.padEnd(cols, " ").slice(0, cols));
    while (lines.length < rows) lines.push(" ".repeat(cols));
    return lines;
  }
  const text = content ?? "";
  return wrapToLines(text, cols, rows);
}

export default function TerminalScreen({
  cols,
  rows,
  content = "",
  cellWidth,
  cellHeight,
  gap = 0,
  theme = "classic",
  border = true,
  glow = true,
  scanlines = false,
  cursor,
  className,
  ariaLabel,
}: TerminalScreenProps) {
  const palette = resolveTheme(theme);
  const lines = useMemo(() => normalizeContent(content, cols, rows), [content, cols, rows]);

  const cursorIndex = cursor
    ? Math.max(0, Math.min(rows - 1, cursor.row)) * cols +
      Math.max(0, Math.min(cols - 1, cursor.col))
    : -1;

  const totalCells = cols * rows;
  const fixed = typeof cellWidth === "number" && typeof cellHeight === "number";

  return (
    <div
      className={[
        "relative inline-block select-none",
        "rounded-2xl overflow-hidden",
        border ? "ring-1" : "",
        glow ? "shadow-[0_0_40px_-10px_rgba(0,0,0,0.6)]" : "",
        className ?? "",
      ].join(" ")}
      style={{
        width: fixed ? cols * cellWidth! : "100%",
        height: fixed ? rows * cellHeight! : "100%",
        background: palette.bg,
        color: palette.fg,
        boxShadow: glow ? `0 0 24px ${palette.accent}33` : undefined,
        borderColor: border ? `${palette.accent}66` : undefined,
        ...(fixed
          ? {}
          : {
              ["--cw" as any]: `calc((100% - ${(cols - 1) * gap}px) / ${cols})`,
              ["--ch" as any]: `calc((100% - ${(rows - 1) * gap}px) / ${rows})`,
            }),
      }}
      aria-label={ariaLabel ?? "Terminal screen"}
      role="img"
    >
      {border && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 60% at 50% -10%, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0) 55%), inset 0 0 0 1px rgba(255,255,255,0.04)",
          }}
        />
      )}

      {scanlines && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,0,0,0.35) 1px, rgba(0,0,0,0) 1px)",
            backgroundSize: fixed
              ? `100% ${Math.max(2, Math.round(cellHeight! / 2))}px`
              : "100% calc(var(--ch) / 2)",
          }}
        />
      )}

      <div
        className="absolute inset-0 font-mono"
        style={
          fixed
            ? {
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, ${cellWidth}px)`,
                gridTemplateRows: `repeat(${rows}, ${cellHeight}px)`,
                gap,
                lineHeight: `${cellHeight}px`,
                fontSize: Math.max(10, Math.floor(cellHeight! * 0.65)),
                letterSpacing: `${Math.max(0, Math.floor(cellWidth! * 0.02))}px`,
                padding: 0,
                margin: 0,
                textShadow: glow ? `0 0 6px ${palette.accent}55` : undefined,
              }
            : {
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, var(--cw))`,
                gridTemplateRows: `repeat(${rows}, var(--ch))`,
                gap,
                lineHeight: "var(--ch)",
                fontSize: "calc(var(--ch) * 0.65)",
                letterSpacing: "calc(var(--cw) * 0.02)",
                padding: 0,
                margin: 0,
                textShadow: glow ? `0 0 6px ${palette.accent}55` : undefined,
              }
        }
      >
        {Array.from({ length: totalCells }).map((_, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const ch = lines[r]?.[c] ?? " ";
          const isCursor = i === cursorIndex;
          return (
            <span
              key={i}
              className={[
                "whitespace-pre",
                "inline-flex items-center justify-center",
                isCursor ? "animate-term-cursor" : "",
              ].join(" ")}
              style={{
                width: fixed ? cellWidth : "var(--cw)",
                height: fixed ? cellHeight : "var(--ch)",
                color: isCursor ? palette.bg : palette.fg,
                background: isCursor ? palette.fg : "transparent",
              }}
              aria-hidden
            >
              {isCursor ? cursor?.char ?? "█" : ch}
            </span>
          );
        })}
      </div>

      {border && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            boxShadow: `inset 0 0 0 2px ${palette.accent}1f, 0 0 0 1px ${palette.accent}22`,
          }}
        />
      )}

      <style>{`
    @keyframes term-cursor-blink { 0%,49%{opacity:1} 50%,100%{opacity:0.1} }
    .animate-term-cursor { animation: term-cursor-blink 1s steps(2, start) infinite; }
  `}</style>
    </div>
  );
}
