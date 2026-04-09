import clsx from "clsx";
import { Users } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { selectActiveRoom } from "../../features/chat/chatSlice";
import { useChatBox } from "./ChatBoxContext";
import { isMobile } from "../../utils/isMobile";
import { uiSlice } from "../../features/ui/uiSlice";
import { selectIsUsersListOpen } from "../../features/ui/selectors";

export function ChatBoxTitle() {
  const { isDark } = useChatBox();
  const activeRoom = useAppSelector(selectActiveRoom);

  const dispatch = useAppDispatch();

  const usersListOpen = useAppSelector(selectIsUsersListOpen);

  if (!activeRoom) return null;

  const isMobileDevice = isMobile();

  const toggleUserList = () => {
    if (isMobileDevice) return;
    dispatch(uiSlice.actions.toggle());
  };

  return (
    <div
      className={clsx(
        "flex items-center justify-between border-b px-5 py-3.5 sm:px-6",
        isDark ? "border-white/8" : "border-slate-200/80",
      )}
    >
      <div className="min-w-0">
        <h2
          className={clsx(
            "truncate text-base font-semibold",
            isDark ? "text-slate-50" : "text-slate-900",
          )}
        >
          <span
            className={clsx(
              "mr-1.5",
              isDark ? "text-sky-400" : "text-[#3390ec]",
            )}
          >
            #
          </span>
          {activeRoom.name}
        </h2>
        <p
          className={clsx(
            "mt-0.5 truncate text-xs",
            isDark ? "text-slate-400" : "text-slate-500",
          )}
        >
          {activeRoom.topic}
        </p>
      </div>
      <div
        className={clsx(
          "ml-4 flex shrink-0 items-center gap-1.5 text-xs font-medium",
          isDark ? "text-slate-400" : "text-slate-500",
          !isMobileDevice && isDark && "cursor-pointer hover:text-white",
          !isMobileDevice && !isDark && "cursor-pointer hover:text-slate-900",
          usersListOpen && (isDark ? "text-white" : "text-slate-900"),
        )}
        onClick={toggleUserList}
      >
        <Users size={14} />
        {activeRoom.members}
      </div>
    </div>
  );
}
