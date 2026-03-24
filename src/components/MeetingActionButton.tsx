import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type MeetingActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function MeetingActionButton({
  children,
  className,
  ...props
}: MeetingActionButtonProps) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex h-14 w-full items-center justify-center rounded-[1.35rem] bg-sky-500 px-6 text-base font-semibold text-slate-950 shadow-[0_16px_40px_rgba(14,165,233,0.28)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400",
        className,
      )}
    >
      {children}
    </button>
  );
}
