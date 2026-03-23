import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatedDotNetwork } from "../components/AnimatedDotNetwork";
import { MeetingActionButton } from "../components/MeetingActionButton";
import { MeetingNameInput } from "../components/MeetingNameInput";

function normalizeMeetingName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function HomePage() {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState("");
  const normalizedRoomName = normalizeMeetingName(roomName);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!normalizedRoomName) {
      return;
    }

    navigate(`/room/${normalizedRoomName}`);
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-white">
      <AnimatedDotNetwork />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,12,21,0.72)_0%,rgba(8,12,21,0.84)_58%,rgba(8,12,21,0.96)_100%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-8 pt-5 sm:px-6 sm:pt-6">
        <header className="flex items-center justify-between">
          <div className="inline-flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-lg font-semibold text-sky-200 shadow-[0_0_40px_rgba(56,189,248,0.16)]">
              P
            </div>

            <div>
              <p className="text-base font-semibold uppercase tracking-[0.16em] text-white/95">
                PhantomChat
              </p>
              <p className="text-sm text-slate-400">
                fast room-based video entry
              </p>
            </div>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center">
          <section className="w-full max-w-3xl text-center">
            <div className="mx-auto max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-[0.45em] text-sky-200/75">
                Meet instantly
              </p>
              <h1 className="mt-6 text-balance font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
                One room name. One tap. No clutter around it.
              </h1>
              <p className="mt-5 text-base leading-7 text-slate-300 sm:text-lg">
                A stripped-down landing page inspired by Jitsi&apos;s
                quick-start flow: just enter a room name and go.
              </p>
            </div>

            <div className="mt-10 rounded-[2rem] border border-white/10 bg-slate-950/55 p-4 shadow-[0_30px_120px_rgba(8,12,21,0.55)] backdrop-blur-xl sm:p-5">
              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <MeetingNameInput
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value)}
                  placeholder="Enter a room name"
                  aria-label="Meeting room name"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />

                <MeetingActionButton
                  type="submit"
                  disabled={!normalizedRoomName}
                  className="sm:w-[10.5rem]"
                >
                  Go
                </MeetingActionButton>
              </form>

              <p className="mt-4 text-sm text-slate-400">
                Try something like{" "}
                <span className="font-medium text-sky-200">
                  design-review-monday
                </span>
                .
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
