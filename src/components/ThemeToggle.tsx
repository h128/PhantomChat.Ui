import clsx from "clsx";
import { Moon, Sun } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  selectResolvedTheme,
  setThemeMode,
  type ResolvedTheme,
} from "../features/theme/themeSlice";

interface ThemeToggleProps {
  className?: string;
}

const themeOptions = [
  {
    value: "light" as const,
    label: "Light",
    icon: Sun,
  },
  {
    value: "dark" as const,
    label: "Dark",
    icon: Moon,
  },
];

const toggleThemeClasses: Record<
  ResolvedTheme,
  {
    container: string;
    active: string;
    inactive: string;
    focusRing: string;
  }
> = {
  light: {
    container:
      "border-white/80 bg-white/75 shadow-[0_12px_30px_rgba(15,23,42,0.08)]",
    active:
      "bg-[#3390ec] text-white shadow-[0_14px_30px_rgba(51,144,236,0.24)]",
    inactive: "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
    focusRing: "focus-visible:ring-sky-500/20",
  },
  dark: {
    container:
      "border-white/10 bg-slate-950/60 shadow-[0_18px_40px_rgba(2,6,23,0.45)]",
    active:
      "bg-sky-400 text-slate-950 shadow-[0_14px_30px_rgba(56,189,248,0.2)]",
    inactive: "text-slate-400 hover:bg-white/5 hover:text-slate-50",
    focusRing: "focus-visible:ring-sky-400/20",
  },
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const dispatch = useAppDispatch();
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const themeClasses = toggleThemeClasses[resolvedTheme];

  return (
    <div
      role="group"
      aria-label="Theme toggle"
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border p-1 backdrop-blur-md transition-colors",
        themeClasses.container,
        className,
      )}
    >
      {themeOptions.map(({ value, label, icon: Icon }) => {
        const isActive = resolvedTheme === value;

        return (
          <button
            key={value}
            type="button"
            aria-label={`Use ${label.toLowerCase()} theme`}
            aria-pressed={isActive}
            title={`Use ${label.toLowerCase()} theme`}
            onClick={() => dispatch(setThemeMode(value))}
            className={clsx(
              "inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-[background-color,color,box-shadow,transform] outline-none focus-visible:ring-4",
              themeClasses.focusRing,
              isActive ? themeClasses.active : themeClasses.inactive,
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2.2} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
