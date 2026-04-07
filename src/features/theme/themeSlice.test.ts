import { describe, expect, it } from "vitest";
import chatReducer from "../chat/chatSlice";
import themeReducer, {
  selectResolvedTheme,
  selectSystemTheme,
  selectThemeMode,
  setSystemTheme,
  setThemeMode,
  toggleTheme,
} from "./themeSlice";
import type { RootState } from "../../app/store";

function createRootState(
  themeState: ReturnType<typeof themeReducer>,
): RootState {
  return {
    chat: chatReducer(undefined, { type: "chat/init" }),
    theme: themeState,
  } as RootState;
}

describe("themeSlice", () => {
  it("defaults to system mode with a light resolved theme in non-browser tests", () => {
    const state = themeReducer(undefined, { type: "theme/init" });

    expect(state.mode).toBe("system");
    expect(state.systemTheme).toBe("light");
  });

  it("sets an explicit theme mode", () => {
    const initialState = themeReducer(undefined, { type: "theme/init" });
    const nextState = themeReducer(initialState, setThemeMode("dark"));

    expect(nextState.mode).toBe("dark");
  });

  it("toggles from explicit light to dark", () => {
    const state = themeReducer(
      themeReducer(undefined, { type: "theme/init" }),
      setThemeMode("light"),
    );

    const nextState = themeReducer(state, toggleTheme());

    expect(nextState.mode).toBe("dark");
  });

  it("toggles from system mode using the current system theme", () => {
    let state = themeReducer(undefined, { type: "theme/init" });
    state = themeReducer(state, setSystemTheme("dark"));

    const nextState = themeReducer(state, toggleTheme());

    expect(nextState.mode).toBe("light");
  });

  it("returns selectors from root state", () => {
    let state = themeReducer(undefined, { type: "theme/init" });
    state = themeReducer(state, setSystemTheme("dark"));

    const rootState = createRootState(state);

    expect(selectThemeMode(rootState)).toBe("system");
    expect(selectSystemTheme(rootState)).toBe("dark");
    expect(selectResolvedTheme(rootState)).toBe("dark");
  });
});
