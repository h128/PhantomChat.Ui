import { afterEach, describe, expect, it, vi } from "vitest";
import { generateRandomRoomName } from "./randomRoomName";

describe("generateRandomRoomName", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses default segment lengths", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    expect(generateRandomRoomName()).toBe("aaa-aaaa-aaa");
  });

  it("supports custom segment lengths", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    expect(generateRandomRoomName([1, 2, 3])).toBe("a-aa-aaa");
  });
});