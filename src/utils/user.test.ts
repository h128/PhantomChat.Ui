import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPersistentUserId, getPersistentUserName } from "./user";

function createStorageMock() {
  const store = new Map<string, string>();

  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

describe("user utilities", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reuses an existing persistent user id", () => {
    localStorage.setItem("phantomchat_user_uuid", "user_existing_123");

    expect(getPersistentUserId()).toBe("user_existing_123");
    expect(getPersistentUserName()).toBe("User existing");
  });

  it("creates and stores a new persistent user id when none exists", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.123456789);
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);

    const userId = getPersistentUserId();

    expect(userId).toBe("user_4fzzzxjylrx_loyw3v28");
    expect(localStorage.getItem("phantomchat_user_uuid")).toBe(userId);
  });
});