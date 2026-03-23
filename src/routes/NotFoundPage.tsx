import { Link } from "react-router-dom";
import { AnimatedDotNetwork } from "../components/AnimatedDotNetwork";

export function NotFoundPage() {
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-white">
      <AnimatedDotNetwork />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,12,21,0.72)_0%,rgba(8,12,21,0.9)_100%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-xl rounded-4xl border border-white/10 bg-slate-950/65 p-8 text-center shadow-[0_30px_120px_rgba(8,12,21,0.55)] backdrop-blur-xl sm:p-10">
          <p className="text-sm font-medium uppercase tracking-[0.35em] text-sky-200/80">
            Missing Route
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            That page does not exist.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-7 text-slate-300">
            The route is outside the current landing-page flow. Head back home
            to start from a room name instead.
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-[1.1rem] bg-sky-500 px-6 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}
