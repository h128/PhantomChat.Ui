import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { applyThemeToDocument } from "./themeDom";
import {
  THEME_STORAGE_KEY,
  selectResolvedTheme,
  selectThemeMode,
  setSystemTheme,
} from "./themeSlice";

export function ThemeController() {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector(selectThemeMode);
  const resolvedTheme = useAppSelector(selectResolvedTheme);

  useEffect(() => {
    applyThemeToDocument(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const mediaQueryList = window.matchMedia("(prefers-color-scheme: dark)");

    const syncSystemTheme = (matches: boolean) => {
      dispatch(setSystemTheme(matches ? "dark" : "light"));
    };

    syncSystemTheme(mediaQueryList.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncSystemTheme(event.matches);
    };

    mediaQueryList.addEventListener("change", handleChange);

    return () => {
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }, [dispatch]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch {
      // Ignore storage failures and keep the in-memory theme state working.
    }
  }, [themeMode]);

  return null;
}
