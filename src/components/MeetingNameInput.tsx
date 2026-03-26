import clsx from "clsx";
import { Input, type InputProps } from "./Input";

type MeetingNameInputProps = InputProps;

export function MeetingNameInput({
  className,
  ...props
}: MeetingNameInputProps) {
  return (
    <Input
      {...props}
      className={clsx(
        "h-14 w-full min-w-0 rounded-[1.35rem] border border-slate-200 bg-slate-50 px-5 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#3390ec]/60 focus:bg-white focus:ring-4 focus:ring-[#3390ec]/10",
        className,
      )}
    />
  );
}
