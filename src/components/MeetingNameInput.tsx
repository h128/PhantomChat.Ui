import clsx from "clsx";
import type { InputHTMLAttributes } from "react";

type MeetingNameInputProps = InputHTMLAttributes<HTMLInputElement>;

export function MeetingNameInput({
  className,
  ...props
}: MeetingNameInputProps) {
  return (
    <input
      {...props}
      className={clsx(
        "h-14 w-full min-w-0 rounded-[1.35rem] border border-white/10 bg-white/5 px-5 text-base text-white placeholder:text-slate-400 outline-none transition focus:border-sky-400/70 focus:bg-white/10 focus:ring-4 focus:ring-sky-500/15",
        className,
      )}
    />
  );
}
