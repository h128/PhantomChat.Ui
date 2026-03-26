import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MeetingActionButton } from "../components/MeetingActionButton";
import { MeetingNameInput } from "../components/MeetingNameInput";
import { generateRandomRoomName } from "../utils/randomRoomName";

function normalizeMeetingName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function HomePage() {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState(generateRandomRoomName());
  const normalizedRoomName = normalizeMeetingName(roomName);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!normalizedRoomName) {
      return;
    }

    navigate(`/room/${normalizedRoomName}`);
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#eaf2f9] text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(51,144,236,0.22),transparent_34%),linear-gradient(180deg,#f7fbff_0%,#eaf2f9_100%)]" />
      <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-300/20 blur-3xl sm:h-96 sm:w-96" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-5 sm:px-6 sm:py-6">
        <header className="flex justify-center sm:justify-start">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/80 bg-white/75 px-4 py-2 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <img
              src="/comment.png"
              alt="PhantomChat logo"
              className="h-10 w-10 rounded-2xl object-cover"
            />

            <div className="text-left">
              <p className="text-sm font-semibold tracking-[0.02em] text-slate-900">
                PhantomChat
              </p>
              <p className="text-xs text-slate-500">
                Just a clean place to start secure chatting
              </p>
            </div>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center py-8 sm:py-12">
          <section className="w-full max-w-lg">
            <div className="rounded-4xl border border-white/75 bg-white/82 px-6 py-8 text-center shadow-[0_32px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:px-10 sm:py-10">
              <img
                src="/comment.png"
                alt="PhantomChat logo"
                className="mx-auto h-24 w-24 rounded-4xl object-cover shadow-[0_18px_40px_rgba(51,144,236,0.24)] sm:h-28 sm:w-28"
              />

              <h1 className="mt-6 text-balance font-display text-[1.5rem] font-semibold tracking-tight text-slate-900 sm:text-[2.05rem]">
                Start or join a room and jump straight into the conversation
              </h1>
              <form onSubmit={handleSubmit} className="mt-8">
                <label
                  htmlFor="room-name"
                  className="mb-3 block text-left text-sm font-medium text-slate-500"
                >
                  Room name
                </label>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <MeetingNameInput
                    id="room-name"
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
                    className="bg-[#3390ec] text-white shadow-[0_16px_40px_rgba(51,144,236,0.24)] hover:bg-[#2b82d9] disabled:bg-[#dce9f6] disabled:text-[#8fa7be] disabled:shadow-none sm:w-36"
                  >
                    Continue
                  </MeetingActionButton>
                </div>
              </form>

              <p className="mt-6 text-xs leading-5 text-slate-400">
                No contact list, no dashboard, no extra steps. Just a clean
                place to start chatting.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
