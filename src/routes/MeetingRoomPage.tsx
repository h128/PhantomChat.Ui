import { Link, useParams } from "react-router-dom";
import { AnimatedDotNetwork } from "../components/AnimatedDotNetwork";

function formatRoomName(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
}

export function MeetingRoomPage() {
  const { roomName = "" } = useParams();
  const displayRoomName = formatRoomName(roomName) || "Untitled Room";

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-white">
      <AnimatedDotNetwork />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,12,21,0.68)_0%,rgba(8,12,21,0.9)_100%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-2xl rounded-4xl border border-white/10 bg-slate-950/60 p-8 text-center shadow-[0_30px_120px_rgba(8,12,21,0.55)] backdrop-blur-xl sm:p-10">
          <p className="text-sm font-medium uppercase tracking-[0.35em] text-sky-200/80">
            Room Placeholder
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {displayRoomName}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-300">
            The homepage form is routing correctly. This placeholder page is
            ready to be replaced with the real meeting experience when you wire
            that next step.
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-[1.1rem] bg-sky-500 px-6 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
