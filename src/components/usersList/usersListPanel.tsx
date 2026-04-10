import clsx from "clsx";
import { useAppSelector } from "../../app/hooks";
import { selectResolvedTheme } from "../../features/theme/themeSlice";
import { selectIsUsersListOpen } from "../../features/ui/selectors";
import { isMobile } from "../../utils/isMobile";
import { CollapseButton } from "./CollapseButton";
import { UsersList } from "./usersList";
import { selectActiveRoomMembersInArray } from "./utils";

export function UsersListPanel() {
  const isMobileDevice = isMobile();

  if (isMobileDevice) return null;
  return <UsersListPannelInner />;
}

function UsersListPannelInner() {
  const isOpen = useAppSelector(selectIsUsersListOpen);

  const members = useAppSelector(selectActiveRoomMembersInArray);
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const totalMembers = members.length;

  if (totalMembers <= 1) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <div
      className={clsx("flex flex-col gap-4 items-center p-5 overflow-hidden", {
        "bg-slate-100": !isDark && isOpen,
        "bg-slate-800/60": isDark && isOpen,
        "mr-5 rounded-lg": isOpen,
      })}
    >
      <div className="shrink-0">
        <CollapseButton />
      </div>
      <div className="overflow-y-auto min-h-0 w-full">
        <UsersList />
      </div>
    </div>
  );
}
