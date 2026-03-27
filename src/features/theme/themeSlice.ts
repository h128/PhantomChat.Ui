import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = Exclude<ThemeMode, "system">;

export const THEME_STORAGE_KEY = "phantomchat.themeMode";

interface ThemeState {
  mode: ThemeMode;
  systemTheme: ResolvedTheme;
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

function getInitialThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  try {
    const storedThemeMode = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(storedThemeMode) ? storedThemeMode : "system";
  } catch {
    return "system";
  }
}

function getInitialSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

const initialState: ThemeState = {
  mode: getInitialThemeMode(),
  systemTheme: getInitialSystemTheme(),
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.mode = action.payload;
    },
    toggleTheme(state) {
      const resolvedTheme =
        state.mode === "system" ? state.systemTheme : state.mode;

      state.mode = resolvedTheme === "dark" ? "light" : "dark";
    },
    setSystemTheme(state, action: PayloadAction<ResolvedTheme>) {
      state.systemTheme = action.payload;
    },
  },
  selectors: {
    selectThemeMode: (state) => state.mode,
    selectSystemTheme: (state) => state.systemTheme,
    selectResolvedTheme: (state): ResolvedTheme =>
      state.mode === "system" ? state.systemTheme : state.mode,
  },
});

export const { setSystemTheme, setThemeMode, toggleTheme } = themeSlice.actions;

export const { selectResolvedTheme, selectSystemTheme, selectThemeMode } =
  themeSlice.selectors;

export default themeSlice.reducer;
