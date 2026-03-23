import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-slate-900/15 bg-slate-50 p-8 text-center">
      <p className="text-sm font-medium uppercase tracking-[0.35em] text-slate-500">
        Missing Route
      </p>
      <h2 className="mt-4 font-display text-3xl tracking-tight text-slate-950">
        That page does not exist.
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">
        The router is configured and working, but this path does not map to an
        app screen yet.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
      >
        Return to overview
      </Link>
    </div>
  );
}
