import { NavLink, Outlet, RouterProvider, createBrowserRouter } from 'react-router-dom'
import { useAppSelector } from './app/hooks'
import { presenceLabels, type PresenceMode } from './features/chat/chatSlice'
import { NotFoundPage } from './routes/NotFoundPage'
import { OverviewPage } from './routes/OverviewPage'
import { RoomsPage } from './routes/RoomsPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <OverviewPage />,
      },
      {
        path: 'rooms',
        element: <RoomsPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])

const navigation = [
  { to: '/', label: 'Overview', end: true },
  { to: '/rooms', label: 'Rooms' },
]

const presenceStyles: Record<
  PresenceMode,
  { badge: string; dot: string; detail: string }
> = {
  focused: {
    badge: 'border-emerald-300/30 bg-emerald-300/15 text-emerald-50',
    dot: 'bg-emerald-300',
    detail: 'Deep work windows stay protected while key rooms keep their signal.',
  },
  available: {
    badge: 'border-amber-300/30 bg-amber-300/15 text-amber-50',
    dot: 'bg-amber-300',
    detail: 'Open for fast iteration, triage, and collaboration-heavy sessions.',
  },
  quiet: {
    badge: 'border-fuchsia-300/30 bg-fuchsia-300/15 text-fuchsia-50',
    dot: 'bg-fuchsia-300',
    detail: 'Heads-down mode with only high-priority pings worth surfacing.',
  },
}

function AppShell() {
  const { activeRoomId, presenceMode, rooms } = useAppSelector((state) => state.chat)
  const totalUnread = rooms.reduce((count, room) => count + room.unread, 0)
  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0]
  const style = presenceStyles[presenceMode]

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-[2rem] border border-white/10 bg-slate-950/75 p-6 text-slate-100 shadow-2xl shadow-slate-950/25 backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-[0.35em] text-cyan-300/80">
                PhantomChat.UI
              </p>
              <h1 className="mt-4 font-display text-4xl tracking-tight text-white sm:text-5xl">
                Vite, TypeScript, Tailwind, Router, and Redux already wired in.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
                This starter keeps the stack modern and lean so you can move
                straight into auth flows, room orchestration, and message
                surfaces.
              </p>
            </div>

            <div
              className={`inline-flex items-center gap-3 rounded-full border px-4 py-2 text-sm font-medium ${style.badge}`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`}></span>
              {presenceLabels[presenceMode]}
            </div>
          </div>
        </header>

        <div className="mt-6 grid flex-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-slate-900/10 bg-white/80 p-5 text-slate-900 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur">
            <div className="rounded-[1.5rem] bg-slate-950 p-5 text-slate-100">
              <p className="text-sm uppercase tracking-[0.25em] text-cyan-200/70">
                Active Room
              </p>
              <p className="mt-3 text-2xl font-semibold">{activeRoom.name}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {activeRoom.topic}
              </p>
            </div>

            <nav className="mt-6 space-y-2">
              {navigation.map((item, index) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? 'bg-slate-950 text-white shadow-lg'
                        : 'bg-slate-900/5 text-slate-700 hover:bg-slate-900/10'
                    }`
                  }
                >
                  <span>{item.label}</span>
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </NavLink>
              ))}
            </nav>

            <div className="mt-6 rounded-[1.5rem] border border-slate-900/10 bg-gradient-to-br from-cyan-50 to-amber-50 p-5">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
                Queue Snapshot
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">
                {totalUnread}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                unread updates across {rooms.length} rooms
              </p>
              <p className="mt-4 text-sm leading-6 text-slate-700">{style.detail}</p>
            </div>
          </aside>

          <main className="rounded-[2rem] border border-slate-900/10 bg-white/88 p-6 text-slate-950 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return <RouterProvider router={router} />
}
