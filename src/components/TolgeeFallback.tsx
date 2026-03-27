import clsx from "clsx";
import { useAppSelector } from "../app/hooks";
import {
  selectResolvedTheme,
  type ResolvedTheme,
} from "../features/theme/themeSlice";

const fallbackThemeClasses: Record<ResolvedTheme, string> = {
  light: "bg-slate-50 text-slate-900",
  dark: "bg-night-900 text-slate-50",
};

export function TolgeeFallback() {
  const resolvedTheme = useAppSelector(selectResolvedTheme);

  return (
    <div
      className={clsx(
        "flex min-h-screen items-center justify-center transition-colors",
        fallbackThemeClasses[resolvedTheme],
      )}
    >
      Loading...
    </div>
  );
}
