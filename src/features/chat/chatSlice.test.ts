import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import themeReducer from "../theme/themeSlice";
import chatReducer, {
  addMessage,
  cyclePresenceMode,
  markRoomRead,
  messageReceived,
  selectActiveRoom,
  selectActiveRoomMessages,
  selectActiveRoomId,
  setActiveRoom,
  setRoomInfo,
} from "./chatSlice";
import type { RootState } from "../../app/store";

vi.mock("../../utils/user", () => ({
  getPersistentUserId: () => "user_test_123",
  getPersistentUserName: () => "User test",
}));

function createRootState(chatState: ReturnType<typeof chatReducer>): RootState {
  return {
    chat: chatState,
    theme: themeReducer(undefined, { type: "theme/init" }),
  } as RootState;
}

describe("chatSlice", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-02T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("cycles presence mode through the expected order", () => {
    let state = chatReducer(undefined, { type: "chat/init" });

    state = chatReducer(state, cyclePresenceMode());
    expect(state.presenceMode).toBe("available");

    state = chatReducer(state, cyclePresenceMode());
    expect(state.presenceMode).toBe("quiet");

    state = chatReducer(state, cyclePresenceMode());
    expect(state.presenceMode).toBe("focused");
  });

  it("marks only the requested room as read", () => {
    const initialState = chatReducer(undefined, { type: "chat/init" });

    const nextState = chatReducer(initialState, markRoomRead("signal-lab"));

    expect(
      nextState.rooms.find((room) => room.id === "signal-lab")?.unread,
    ).toBe(0);
    expect(
      nextState.rooms.find((room) => room.id === "launch-pad")?.unread,
    ).toBe(7);
  });

  it("stores room join metadata", () => {
    const initialState = chatReducer(undefined, { type: "chat/init" });

    const nextState = chatReducer(
      initialState,
      setRoomInfo({ key: "room-key-1", status: "joined" }),
    );

    expect(nextState.roomKey).toBe("room-key-1");
    expect(nextState.roomStatus).toBe("joined");
  });

  it("creates optimistic messages with prepared sender metadata", () => {
    const initialState = chatReducer(undefined, { type: "chat/init" });

    const action = addMessage({ roomId: "launch-pad", content: "Hello team" });
    const nextState = chatReducer(initialState, action);

    expect(nextState.messages["launch-pad"]).toHaveLength(1);
    expect(nextState.messages["launch-pad"][0]).toMatchObject({
      senderId: "user_test_123",
      senderName: "User test",
      content: "Hello team",
      timestamp: "2026-04-02T10:00:00.000Z",
    });
    expect(nextState.messages["launch-pad"][0].id).toEqual(expect.any(String));
  });

  it("appends received messages to rooms that were not initialized yet", () => {
    const initialState = chatReducer(undefined, { type: "chat/init" });

    const nextState = chatReducer(
      initialState,
      messageReceived({
        roomId: "new-room",
        message: {
          id: "msg-1",
          senderId: "system",
          senderName: "System",
          content: "Welcome",
          timestamp: "2026-04-02T10:00:00.000Z",
        },
      }),
    );

    expect(nextState.messages["new-room"]).toEqual([
      {
        id: "msg-1",
        senderId: "system",
        senderName: "System",
        content: "Welcome",
        timestamp: "2026-04-02T10:00:00.000Z",
      },
    ]);
  });

  it("returns active room selectors from root state", () => {
    let state = chatReducer(undefined, { type: "chat/init" });
    state = chatReducer(state, setActiveRoom("signal-lab"));
    state = chatReducer(
      state,
      messageReceived({
        roomId: "signal-lab",
        message: {
          id: "msg-2",
          senderId: "user_2",
          senderName: "User 2",
          content: "Testing selectors",
          timestamp: "2026-04-02T10:00:00.000Z",
        },
      }),
    );

    const rootState = createRootState(state);

    expect(selectActiveRoomId(rootState)).toBe("signal-lab");
    expect(selectActiveRoom(rootState)?.name).toBe("Signal Lab");
    expect(selectActiveRoomMessages(rootState)).toEqual([
      {
        id: "msg-2",
        senderId: "user_2",
        senderName: "User 2",
        content: "Testing selectors",
        timestamp: "2026-04-02T10:00:00.000Z",
      },
    ]);
  });
});
