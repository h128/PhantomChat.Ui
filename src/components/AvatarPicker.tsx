import clsx from "clsx";
import { UserAvatar } from "../components/UserAvatar";
import { AvatarCatalog } from "../features/profile/avatarCatalog";

interface AvatarPickerProps {
  selectedAvatarId: number | null;
  onSelect: (avatarId: number) => void;
  isDark: boolean;
}

export function AvatarPicker({
  selectedAvatarId,
  onSelect,
  isDark,
}: AvatarPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {AvatarCatalog.map((avatar) => {
        const isSelected = avatar.id === selectedAvatarId;

        return (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onSelect(avatar.id)}
            className={clsx(
              "group aspect-square rounded-2xl border p-1.5 text-center transition focus:outline-none focus:ring-4",
              isSelected
                ? isDark
                  ? "border-sky-400/60 bg-sky-400/10 ring-sky-400/20"
                  : "border-[#3390ec]/50 bg-[#3390ec]/8 ring-[#3390ec]/12"
                : isDark
                  ? "border-white/10 bg-slate-900/75 hover:border-white/20 hover:bg-slate-900"
                  : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white",
            )}
            aria-pressed={isSelected}
          >
            <UserAvatar
              avatarId={avatar.id}
              displayName={avatar.label}
              isDark={isDark}
              className="h-full w-full rounded-[1.05rem]"
            />
          </button>
        );
      })}
    </div>
  );
}