import { useAppSelector } from "../../app/hooks";
import { selectResolvedTheme } from "../../features/theme/themeSlice";
import { selectIsUsersListOpen } from "../../features/ui/selectors";
import { UserAvatar } from "../UserAvatar";
import { selectActiveRoomMembersInArray } from "./utils";

export function UsersList() {
  const activeRoomMembers = useAppSelector(selectActiveRoomMembersInArray);
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const isOpen = useAppSelector(selectIsUsersListOpen);
  if (!isOpen) return null;

  return (
    <div className="flex flex-col items-left gap-4 p-2 overflow-y-auto">
      {activeRoomMembers.map((member, index) => (
        <div key={index} className="flex items-center gap-2">
          <UserAvatar
            avatarId={member.avatarId}
            displayName={member.displayName}
            isDark={resolvedTheme === "dark"}
            className="mt-0.5 h-9 w-9 shrink-0"
          />
          <span className="text-sm">{member.displayName}</span>
        </div>
      ))}
    </div>
  );
}
