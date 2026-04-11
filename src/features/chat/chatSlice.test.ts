import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import themeReducer from "../theme/themeSlice";
import chatReducer, {
  addMessage,
  completeRoomHistoryLoad,
  cyclePresenceMode,
  failRoomHistoryLoad,
  messageReceived,
  selectActiveRoom,
  selectActiveRoomHistory,
  selectActiveRoomMessages,
  selectActiveRoomId,
  startRoomHistoryLoad,
  setActiveRoom,
  setRoomMembers,
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
    profile: {
      userId: "user_test_123",
      displayName: "User test",
      avatarId: 1,
    },
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

    state = chatReducer(state, cyclePresenceMode(undefined));
    expect(state.presenceMode).toBe("available");

    state = chatReducer(state, cyclePresenceMode(undefined));
    expect(state.presenceMode).toBe("quiet");

    state = chatReducer(state, cyclePresenceMode(undefined));
    expect(state.presenceMode).toBe("focused");
  });

  it("stores room members and keeps a usable room summary", () => {
    const initialState = chatReducer(undefined, { type: "chat/init" });

    const nextState = chatReducer(
      initialState,
      setRoomMembers({
        roomId: "signal-lab",
        members: [
          {
            userId: "user_test_123",
            displayName: "User test",
            avatarId: 1,
          },
          {
            userId: "user_2",
            displayName: "User 2",
            avatarId: 2,
          },
        ],
      }),
    );

    expect(nextState.membersByRoom["signal-lab"]["user_2"]).toMatchObject({
      displayName: "User 2",
      avatarId: 2,
    });
    expect(
      nextState.rooms.find((room) => room.id === "signal-lab")?.members,
    ).toBe(2);
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

    const action = addMessage({
      roomId: "launch-pad",
      content: "Hello team",
      senderName: "User test",
    });
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

  it("merges history with realtime messages without duplicating overlap", () => {
    let state = chatReducer(undefined, { type: "chat/init" });
    state = chatReducer(state, setActiveRoom("signal-lab"));
    state = chatReducer(
      state,
      messageReceived({
        roomId: "signal-lab",
        message: {
          id: "live-1",
          senderId: "user_2",
          senderName: "User 2",
          content: "Second",
          timestamp: "2026-04-02T10:02:00.000Z",
          origin: "realtime",
        },
      }),
    );

    state = chatReducer(
      state,
      completeRoomHistoryLoad({
        roomId: "signal-lab",
        loadedAt: "2026-04-02T10:03:00.000Z",
        messages: [
          {
            id: "history-1",
            senderId: "user_1",
            senderName: "User 1",
            content: "First",
            timestamp: "2026-04-02T10:01:00.000Z",
            origin: "history",
          },
          {
            id: "history-2",
            senderId: "user_2",
            senderName: "User 2",
            content: "Second",
            timestamp: "2026-04-02T10:02:00.000Z",
            origin: "history",
          },
        ],
      }),
    );

    expect(state.messages["signal-lab"]).toEqual([
      {
        id: "history-1",
        senderId: "user_1",
        senderName: "User 1",
        content: "First",
        timestamp: "2026-04-02T10:01:00.000Z",
        origin: "history",
      },
      {
        id: "live-1",
        senderId: "user_2",
        senderName: "User 2",
        content: "Second",
        timestamp: "2026-04-02T10:02:00.000Z",
        origin: "realtime",
      },
    ]);
  });

  it("reconciles optimistic echoes with realtime deliveries", () => {
    let state = chatReducer(undefined, { type: "chat/init" });
    state = chatReducer(state, setActiveRoom("signal-lab"));
    state = chatReducer(
      state,
      addMessage({
        roomId: "signal-lab",
        content: "Echo check",
        senderName: "User test",
      }),
    );

    state = chatReducer(
      state,
      messageReceived({
        roomId: "signal-lab",
        message: {
          id: "server-1",
          senderId: "user_test_123",
          senderName: "User test",
          content: "Echo check",
          timestamp: "2026-04-02T10:00:05.000Z",
          origin: "realtime",
        },
      }),
    );

    expect(state.messages["signal-lab"]).toHaveLength(1);
    expect(state.messages["signal-lab"][0]).toMatchObject({
      senderId: "user_test_123",
      content: "Echo check",
      origin: "realtime",
    });
  });

  it("tracks room history loading state separately from room join state", () => {
    let state = chatReducer(undefined, { type: "chat/init" });
    state = chatReducer(state, setActiveRoom("signal-lab"));
    state = chatReducer(
      state,
      startRoomHistoryLoad({ roomId: "signal-lab" }),
    );
    state = chatReducer(
      state,
      failRoomHistoryLoad({
        roomId: "signal-lab",
        error: "History could not be loaded.",
      }),
    );

    const rootState = createRootState(state);

    expect(selectActiveRoomHistory(rootState)).toEqual({
      status: "error",
      error: "History could not be loaded.",
      lastLoadedAt: null,
    });
  });

  it("returns active room selectors from root state", () => {
    let state = chatReducer(undefined, { type: "chat/init" });
    state = chatReducer(state, setActiveRoom("signal-lab"));
    state = chatReducer(
      state,
      setRoomMembers({
        roomId: "signal-lab",
        members: [
          {
            userId: "user_2",
            displayName: "User 2",
            avatarId: 2,
          },
        ],
      }),
    );
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
    expect(selectActiveRoom(rootState)?.members).toBe(1);
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
