import { useAppDispatch, useAppSelector } from '../app/hooks'
import { markRoomRead, setActiveRoom } from '../features/chat/chatSlice'

export function RoomsPage() {
  const dispatch = useAppDispatch()
  const { activeRoomId, rooms } = useAppSelector((state) => state.chat)
  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0]

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
      <section>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium uppercase tracking-[0.35em] text-slate-500">
            Rooms
          </p>
          <h2 className="font-display text-3xl tracking-tight text-slate-950">
            Sample channel list driven by Redux Toolkit.
          </h2>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            These records are deliberately simple, but the route structure and
            state wiring are ready for richer room metadata, streaming messages,
            and server-backed fetch layers.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {rooms.map((room) => {
            const isActive = room.id === activeRoomId

            return (
              <article
                key={room.id}
                className={`rounded-[1.5rem] border p-5 transition ${
                  isActive
                    ? 'border-slate-950 bg-slate-950 text-white shadow-xl shadow-slate-950/15'
                    : 'border-slate-900/10 bg-white text-slate-950 shadow-sm'
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-semibold">{room.name}</h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] ${
                          room.unread > 0
                            ? isActive
                              ? 'bg-white/10 text-cyan-200'
                              : 'bg-amber-100 text-amber-700'
                            : isActive
                              ? 'bg-white/10 text-slate-300'
                              : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {room.unread > 0 ? `${room.unread} unread` : 'cleared'}
                      </span>
                    </div>
                    <p
                      className={`mt-3 max-w-2xl text-sm leading-6 ${
                        isActive ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      {room.topic}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => dispatch(setActiveRoom(room.id))}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        isActive
                          ? 'bg-white text-slate-950 hover:bg-slate-100'
                          : 'bg-slate-950 text-white hover:bg-slate-800'
                      }`}
                    >
                      {isActive ? 'Selected' : 'Select room'}
                    </button>
                    <button
                      type="button"
                      onClick={() => dispatch(markRoomRead(room.id))}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        isActive
                          ? 'border-white/15 bg-white/5 text-white hover:bg-white/10'
                          : 'border-slate-900/10 bg-white text-slate-700 hover:border-slate-900/20 hover:bg-slate-50'
                      }`}
                    >
                      Mark read
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <aside className="rounded-[1.5rem] border border-slate-900/10 bg-[linear-gradient(180deg,#ffffff_0%,#f5efe1_100%)] p-5 shadow-sm">
        <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
          Selected Room
        </p>
        <h3 className="mt-3 text-2xl font-semibold text-slate-950">
          {activeRoom.name}
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {activeRoom.topic}
        </p>

        <div className="mt-6 grid gap-4">
          <div className="rounded-2xl bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Members
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {activeRoom.members}
            </p>
          </div>
          <div className="rounded-2xl bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Unread
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {activeRoom.unread}
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}
