import clsx from "clsx";
import { getAvatarById } from "../features/profile/avatarCatalog";

interface UserAvatarProps {
  avatarId?: number | null;
  displayName?: string;
  isDark: boolean;
  className?: string;
}

export function UserAvatar({
  avatarId,
  displayName,
  isDark,
  className,
}: UserAvatarProps) {
  const avatar = getAvatarById(avatarId);
  const initial = displayName?.trim().charAt(0).toUpperCase() || "?";

  if (avatar) {
    return (
      <div
        className={clsx(
          "relative overflow-hidden rounded-lg bg-white/70",
          className,
        )}
      >
        <img
          src={avatar.src}
          alt={displayName || avatar.label}
          className="h-full w-full scale-[1.08] object-cover object-center"
        />
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "flex items-center justify-center rounded-lg text-sm font-semibold",
        isDark ? "bg-sky-400/15 text-sky-300" : "bg-[#3390ec]/10 text-[#3390ec]",
        className,
      )}
    >
      {initial}
    </div>
  );
}