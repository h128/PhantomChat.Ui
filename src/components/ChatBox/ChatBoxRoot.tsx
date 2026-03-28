import clsx from "clsx";
import type { ReactNode } from "react";
import { useAppSelector } from "../../app/hooks";
import { selectResolvedTheme } from "../../features/theme/themeSlice";
import { ChatBoxContext } from "./ChatBoxContext";

export function ChatBoxRoot({ children }: { children: ReactNode }) {
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const isDark = resolvedTheme === "dark";

  return (
    <ChatBoxContext.Provider value={{ isDark }}>
      <div
        className={clsx(
          "flex flex-1 flex-col overflow-hidden rounded-3xl border backdrop-blur-xl transition-colors",
          isDark
            ? "border-white/10 bg-slate-950/72 shadow-[0_32px_90px_rgba(2,6,23,0.45)]"
            : "border-white/75 bg-white/82 shadow-[0_32px_90px_rgba(15,23,42,0.12)]",
        )}
      >
        {children}
      </div>
    </ChatBoxContext.Provider>
  );
}
