import clsx from "clsx";
import { Link, useParams } from "react-router-dom";
import { useAppSelector } from "../app/hooks";
import { ThemeToggle } from "../components/ThemeToggle";
import { selectResolvedTheme } from "../features/theme/themeSlice";

function formatRoomName(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
}

export function MeetingRoomPage() {
  const { roomName = "" } = useParams();
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const isDark = resolvedTheme === "dark";
  const displayRoomName = formatRoomName(roomName) || "Untitled Room";

  return (
    <div
      className={clsx(
        "relative isolate min-h-screen overflow-hidden transition-colors",
        isDark ? "bg-night-950 text-slate-50" : "bg-[#eaf2f9] text-slate-900",
      )}
    >
      <div
        className={clsx(
          "absolute inset-0",
          isDark
            ? "bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_30%),linear-gradient(180deg,#09101d_0%,#0b1120_100%)]"
            : "bg-[radial-gradient(circle_at_top,rgba(51,144,236,0.22),transparent_34%),linear-gradient(180deg,#f7fbff_0%,#eaf2f9_100%)]",
        )}
      />
      <div
        className={clsx(
          "absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl sm:h-96 sm:w-96",
          isDark ? "bg-sky-400/12" : "bg-sky-300/20",
        )}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-5 sm:px-6 sm:py-6">
        <header className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div
            className={clsx(
              "inline-flex items-center gap-3 rounded-full border px-4 py-2 backdrop-blur-md transition-colors",
              isDark
                ? "border-white/10 bg-slate-950/60 shadow-[0_18px_40px_rgba(2,6,23,0.45)]"
                : "border-white/80 bg-white/75 shadow-[0_12px_30px_rgba(15,23,42,0.08)]",
            )}
          >
            <img
              src="/comment.png"
              alt="PhantomChat logo"
              className="h-10 w-10 rounded-2xl object-cover"
            />

            <div className="text-left">
              <p
                className={clsx(
                  "text-sm font-semibold tracking-[0.02em]",
                  isDark ? "text-slate-50" : "text-slate-900",
                )}
              >
                PhantomChat
              </p>
              <p
                className={clsx(
                  "text-xs",
                  isDark ? "text-slate-400" : "text-slate-500",
                )}
              >
                Private rooms with a minimal start screen
              </p>
            </div>
          </div>

          <ThemeToggle />
        </header>

        <main className="flex flex-1 items-center justify-center py-8 sm:py-12">
          <section className="w-full max-w-lg">
            <div
              className={clsx(
                "rounded-4xl border px-6 py-8 text-center backdrop-blur-xl transition-colors sm:px-10 sm:py-10",
                isDark
                  ? "border-white/10 bg-slate-950/72 shadow-[0_32px_90px_rgba(2,6,23,0.45)]"
                  : "border-white/75 bg-white/82 shadow-[0_32px_90px_rgba(15,23,42,0.12)]",
              )}
            >
              <img
                src="/comment.png"
                alt="PhantomChat logo"
                className="mx-auto h-24 w-24 rounded-4xl object-cover shadow-[0_18px_40px_rgba(51,144,236,0.24)] sm:h-28 sm:w-28"
              />

              <p
                className={clsx(
                  "mt-6 text-sm font-medium uppercase tracking-[0.28em]",
                  isDark ? "text-sky-300" : "text-[#3390ec]",
                )}
              >
                Room Placeholder
              </p>
              <h1
                className={clsx(
                  "mt-3 text-balance font-display text-3xl font-semibold tracking-tight sm:text-[2.5rem]",
                  isDark ? "text-slate-50" : "text-slate-900",
                )}
              >
                {displayRoomName}
              </h1>
              <p
                className={clsx(
                  "mt-3 text-sm leading-6 sm:text-base",
                  isDark ? "text-slate-400" : "text-slate-500",
                )}
              >
                The homepage routing is working. This screen now matches the
                home route visually and is ready to be replaced with the real
                meeting experience next.
              </p>

              <div
                className={clsx(
                  "mt-8 rounded-3xl border px-5 py-4 text-left transition-colors",
                  isDark
                    ? "border-slate-800 bg-slate-900/80"
                    : "border-slate-200 bg-slate-50",
                )}
              >
                <p
                  className={clsx(
                    "text-sm font-medium",
                    isDark ? "text-slate-400" : "text-slate-500",
                  )}
                >
                  Room link
                </p>
                <p
                  className={clsx(
                    "mt-1 break-all text-base font-semibold",
                    isDark ? "text-slate-100" : "text-slate-900",
                  )}
                >
                  /room/{roomName || "untitled-room"}
                </p>
              </div>

              <Link
                to="/"
                className={clsx(
                  "mt-8 inline-flex h-14 items-center justify-center rounded-[1.35rem] px-8 text-base font-semibold transition",
                  isDark
                    ? "bg-sky-400 text-slate-950 shadow-[0_16px_40px_rgba(56,189,248,0.2)] hover:bg-sky-300"
                    : "bg-[#3390ec] text-white shadow-[0_16px_40px_rgba(51,144,236,0.24)] hover:bg-[#2b82d9]",
                )}
              >
                Back home
              </Link>

              <p
                className={clsx(
                  "mt-6 text-xs leading-5",
                  isDark ? "text-slate-500" : "text-slate-400",
                )}
              >
                Same palette, same spacing system, and a simpler placeholder
                until the actual room UI is wired in.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
