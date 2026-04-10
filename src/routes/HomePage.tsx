import clsx from "clsx";
import { type FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { AvatarPicker } from "../components/AvatarPicker";
import { MeetingActionButton } from "../components/MeetingActionButton";
import { MeetingNameInput } from "../components/MeetingNameInput";
import { ThemeToggle } from "../components/ThemeToggle";
import { UserAvatar } from "../components/UserAvatar";
import { selectProfile, setProfile } from "../features/profile/profileSlice";
import { selectResolvedTheme } from "../features/theme/themeSlice";
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
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();

  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const profile = useAppSelector(selectProfile);
  const isDark = resolvedTheme === "dark";
  const [roomName, setRoomName] = useState(
    searchParams.get("room") || generateRandomRoomName(),
  );
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [selectedAvatarId, setSelectedAvatarId] = useState<number | null>(
    profile.avatarId,
  );
  const normalizedRoomName = normalizeMeetingName(roomName);
  const normalizedDisplayName = displayName.trim().replace(/\s+/g, " ");
  const canContinue =
    Boolean(normalizedRoomName) &&
    Boolean(normalizedDisplayName) &&
    selectedAvatarId !== null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!normalizedRoomName) {
      toast.error("Enter a room name to continue.");
      return;
    }

    if (!normalizedDisplayName) {
      toast.error("Choose a nickname to continue.");
      return;
    }

    if (selectedAvatarId === null) {
      toast.error("Select an avatar to continue.");
      return;
    }

    dispatch(
      setProfile({
        displayName: normalizedDisplayName,
        avatarId: selectedAvatarId,
      }),
    );

    navigate(`/room/${normalizedRoomName}`);
  }

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
                Just a clean place to start secure chatting
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

              <h1
                className={clsx(
                  "mt-6 text-balance font-display text-[1.5rem] font-semibold tracking-tight sm:text-[2.05rem]",
                  isDark ? "text-slate-50" : "text-slate-900",
                )}
              >
                Start or join a room and jump straight into the conversation
              </h1>
              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-left">
                      <p
                        className={clsx(
                          "text-sm font-medium",
                          isDark ? "text-slate-400" : "text-slate-500",
                        )}
                      >
                        Avatar
                      </p>
                      <p
                        className={clsx(
                          "text-xs",
                          isDark ? "text-slate-500" : "text-slate-400",
                        )}
                      >
                        Pick one from the built-in avatar set
                      </p>
                    </div>
                  </div>

                  <AvatarPicker
                    selectedAvatarId={selectedAvatarId}
                    onSelect={setSelectedAvatarId}
                    isDark={isDark}
                  />
                </div>

                <div>
                  <label
                    htmlFor="display-name"
                    className={clsx(
                      "mb-3 block text-left text-sm font-medium",
                      isDark ? "text-slate-400" : "text-slate-500",
                    )}
                  >
                    Nickname
                  </label>

                  <div className="flex items-center gap-3 sm:gap-4">
                    <MeetingNameInput
                      id="display-name"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      maxLength={64}
                      placeholder="Choose how people will see you"
                      autoComplete="nickname"
                      className={clsx(
                        "flex-1",
                        isDark &&
                          "border-slate-800 bg-slate-900/80 text-white placeholder:text-slate-500 focus:border-sky-400/60 focus:bg-slate-950 focus:ring-sky-400/10 focus:text-black",
                      )}
                    />

                    <UserAvatar
                      avatarId={selectedAvatarId}
                      displayName={normalizedDisplayName}
                      isDark={isDark}
                      className="h-14 w-14 rounded-[1.1rem] sm:h-14 sm:w-14"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="room-name"
                    className={clsx(
                      "mb-3 block text-left text-sm font-medium",
                      isDark ? "text-slate-400" : "text-slate-500",
                    )}
                  >
                    Room name
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <MeetingNameInput
                      id="room-name"
                      value={roomName}
                      onChange={(event) => setRoomName(event.target.value)}
                      placeholder="Enter a room name"
                      aria-label="Meeting room name"
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      className={clsx(
                        "flex-1",
                        isDark &&
                          "border-slate-800 bg-slate-900/80 text-white placeholder:text-slate-500 focus:border-sky-400/60 focus:bg-slate-950 focus:ring-sky-400/10 focus:text-black",
                      )}
                    />

                    <MeetingActionButton
                      type="submit"
                      disabled={!canContinue}
                      className={clsx(
                        "sm:w-36",
                        isDark
                          ? "bg-sky-400 text-slate-950 shadow-[0_16px_40px_rgba(56,189,248,0.2)] hover:bg-sky-300 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
                          : "bg-[#3390ec] text-white shadow-[0_16px_40px_rgba(51,144,236,0.24)] hover:bg-[#2b82d9] disabled:bg-[#dce9f6] disabled:text-[#8fa7be] disabled:shadow-none",
                      )}
                    >
                      Continue
                    </MeetingActionButton>
                  </div>
                </div>
              </form>

              <p
                className={clsx(
                  "mt-6 text-xs leading-5",
                  isDark ? "text-slate-500" : "text-slate-400",
                )}
              >
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
