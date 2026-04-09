import clsx from "clsx";
import { Check, Copy, Link, Shield, X } from "lucide-react";
import { useState } from "react";
import { useAppSelector } from "../app/hooks";
import { selectProfile } from "../features/profile/profileSlice";
import { selectResolvedTheme } from "../features/theme/themeSlice";

type InviteOthersProps = {
  roomName: string;
  onClose: () => void;
};

export function InviteOthers({ roomName, onClose }: InviteOthersProps) {
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const profile = useAppSelector(selectProfile);
  const isDark = resolvedTheme === "dark";
  const [copied, setCopied] = useState(false);

  const baseUrl = import.meta.env.VITE_HTTP_URL as string;
  const meetingLink = `${baseUrl}/room/${roomName}`;

  function handleCopy() {
    navigator.clipboard.writeText(meetingLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
      <div
        className={clsx(
          "relative w-full max-w-md rounded-3xl p-7 shadow-2xl transition-all",
          isDark
            ? "border border-white/10 bg-slate-900 text-white"
            : "border border-slate-200 bg-white text-slate-900",
        )}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={clsx(
            "absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full transition-colors",
            isDark
              ? "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              : "text-slate-400 hover:bg-slate-100 hover:text-slate-700",
          )}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <h2 className="mb-5 text-xl font-bold">Your meeting's ready</h2>

        {/* Share text */}
        <p
          className={clsx(
            "mb-3 text-sm",
            isDark ? "text-slate-400" : "text-slate-500",
          )}
        >
          Share this meeting link with others you want in the meeting
        </p>

        {/* Link box */}
        <div
          className={clsx(
            "flex items-center gap-2 rounded-xl px-4 py-3",
            isDark ? "bg-slate-800" : "bg-slate-100",
          )}
        >
          <Link
            size={16}
            className={clsx(
              "shrink-0",
              isDark ? "text-slate-500" : "text-slate-400",
            )}
          />
          <span
            className={clsx(
              "min-w-0 flex-1 truncate text-sm",
              isDark ? "text-slate-300" : "text-slate-700",
            )}
          >
            {meetingLink}
          </span>
          <button
            onClick={handleCopy}
            className={clsx(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all hover:scale-110 active:scale-95",
              copied
                ? "text-emerald-500"
                : isDark
                  ? "text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                  : "text-slate-500 hover:bg-slate-200 hover:text-slate-700",
            )}
            title="Copy link"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>

        {/* Permission note */}
        <div className="mt-4 flex items-start gap-2.5">
          <Shield
            size={16}
            className={clsx(
              "mt-0.5 shrink-0",
              isDark ? "text-slate-500" : "text-slate-400",
            )}
          />
          <p
            className={clsx(
              "text-xs leading-relaxed",
              isDark ? "text-slate-500" : "text-slate-400",
            )}
          >
            People who use this meeting link must get your permission before
            they can join.
          </p>
        </div>

        {/* Joined as */}
        <p
          className={clsx(
            "mt-5 text-xs",
            isDark ? "text-slate-500" : "text-slate-400",
          )}
        >
          Joined as{" "}
          <span className={isDark ? "text-slate-300" : "text-slate-600"}>
            {profile.displayName}
          </span>
        </p>
      </div>
    </div>
  );
}
