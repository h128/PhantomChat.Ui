import { useAppDispatch, useAppSelector } from '../app/hooks'
import {
  cyclePresenceMode,
  markRoomRead,
  presenceLabels,
  type PresenceMode,
} from '../features/chat/chatSlice'

const toneStyles: Record<PresenceMode, string> = {
  focused: 'from-emerald-400 to-cyan-400',
  available: 'from-amber-400 to-orange-400',
  quiet: 'from-fuchsia-500 to-rose-400',
}

export function OverviewPage() {
  const dispatch = useAppDispatch()
  const { activeRoomId, presenceMode, rooms } = useAppSelector((state) => state.chat)
  const totalUnread = rooms.reduce((count, room) => count + room.unread, 0)
  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0]

  return (
    <div className="space-y-8">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[1.75rem] border border-slate-900/10 bg-[linear-gradient(135deg,#ffffff_0%,#f3efe4_55%,#fee2b8_100%)] p-6 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.35em] text-slate-500">
            Pulse Overview
          </p>
          <h2 className="mt-4 max-w-2xl font-display text-3xl tracking-tight text-slate-950 sm:text-4xl">
            A clean React foundation with the routing and state plumbing already
            in place.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Use this shell as the base for conversation timelines, room
            permissions, notification tuning, and the rest of the PhantomChat
            surface area.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => dispatch(cyclePresenceMode())}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Cycle presence mode
            </button>
            <button
              type="button"
              onClick={() => dispatch(markRoomRead(activeRoom.id))}
              className="rounded-full border border-slate-950/10 bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:border-slate-950/20 hover:bg-slate-50"
            >
              Clear {activeRoom.name} alerts
            </button>
          </div>
        </div>

        <div className="rounded-[1.75rem] bg-slate-950 p-6 text-slate-100 shadow-xl shadow-slate-950/20">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/70">
            Compiler Status
          </p>
          <div
            className={`mt-5 h-3 rounded-full bg-gradient-to-r ${toneStyles[presenceMode]}`}
          ></div>
          <p className="mt-5 text-2xl font-semibold">{presenceLabels[presenceMode]}</p>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            React Compiler is enabled in Vite, so this project starts from the
            optimized path instead of treating it like a later migration.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[1.5rem] border border-slate-900/10 bg-white p-5 shadow-sm">
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">
            Rooms
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{rooms.length}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Seeded with a few channels so the store and routing have something
            real to bind to.
          </p>
        </article>

        <article className="rounded-[1.5rem] border border-slate-900/10 bg-white p-5 shadow-sm">
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">
            Unread
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{totalUnread}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Routed pages are reading from the same Redux state without extra
            boilerplate.
          </p>
        </article>

        <article className="rounded-[1.5rem] border border-slate-900/10 bg-white p-5 shadow-sm">
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">
            Active Room
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {activeRoom.name}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {activeRoom.topic}
          </p>
        </article>
      </section>
    </div>
  )
}
