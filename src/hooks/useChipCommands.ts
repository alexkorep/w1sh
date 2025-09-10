import { useState, useCallback, useMemo } from "react";
import type { FSNode } from "./useDosShell";

export type ChipCommand = { text: string; onPress: () => void };

interface UseChipCommandsProps {
  promptActive: boolean;
  cwd: string[];
  nodeAtPath: (pathParts: string[]) => Record<string, FSNode> | FSNode | null;
  setLine: (text: string) => void;
  runCommand: (cmd: string) => void;
}

export function useChipCommands({
  promptActive,
  cwd,
  nodeAtPath,
  setLine,
  runCommand,
}: UseChipCommandsProps) {
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

  return { chipCommands };
}
