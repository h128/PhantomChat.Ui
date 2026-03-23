import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type PresenceMode = 'focused' | 'available' | 'quiet'

export interface Room {
  id: string
  name: string
  topic: string
  members: number
  unread: number
}

interface ChatState {
  presenceMode: PresenceMode
  activeRoomId: string
  rooms: Room[]
}

const presenceOrder: PresenceMode[] = ['focused', 'available', 'quiet']

export const presenceLabels: Record<PresenceMode, string> = {
  focused: 'Focused',
  available: 'Available',
  quiet: 'Quiet Hours',
}

const initialState: ChatState = {
  presenceMode: 'focused',
  activeRoomId: 'launch-pad',
  rooms: [
    {
      id: 'launch-pad',
      name: 'Launch Pad',
      topic: 'Ship blockers, release timing, and cutover prep.',
      members: 14,
      unread: 7,
    },
    {
      id: 'signal-lab',
      name: 'Signal Lab',
      topic: 'User feedback triage and validation experiments.',
      members: 8,
      unread: 3,
    },
    {
      id: 'ops-watch',
      name: 'Ops Watch',
      topic: 'Deploy health, alerts, and overnight handoff notes.',
      members: 5,
      unread: 1,
    },
  ],
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    cyclePresenceMode(state) {
      const currentIndex = presenceOrder.indexOf(state.presenceMode)
      state.presenceMode =
        presenceOrder[(currentIndex + 1) % presenceOrder.length]
    },
    setActiveRoom(state, action: PayloadAction<string>) {
      const roomExists = state.rooms.some((room) => room.id === action.payload)

      if (roomExists) {
        state.activeRoomId = action.payload
      }
    },
    markRoomRead(state, action: PayloadAction<string>) {
      const room = state.rooms.find((entry) => entry.id === action.payload)

      if (room) {
        room.unread = 0
      }
    },
  },
})

export const { cyclePresenceMode, markRoomRead, setActiveRoom } =
  chatSlice.actions

export default chatSlice.reducer
