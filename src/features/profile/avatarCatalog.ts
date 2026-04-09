import avatar01 from "../../assets/avatars/avatar-01.svg";
import avatar02 from "../../assets/avatars/avatar-02.svg";
import avatar03 from "../../assets/avatars/avatar-03.svg";
import avatar04 from "../../assets/avatars/avatar-04.svg";
import avatar05 from "../../assets/avatars/avatar-05.svg";
import avatar06 from "../../assets/avatars/avatar-06.svg";

export type AvatarDefinition = {
  id: number;
  label: string;
  src: string;
  group: "classic" | "bright" | "soft" | "warm";
};

export const AvatarCatalog: AvatarDefinition[] = [
  { id: 1, label: "Skylark", src: avatar01, group: "classic" },
  { id: 2, label: "Maple", src: avatar02, group: "warm" },
  { id: 3, label: "Juniper", src: avatar03, group: "soft" },
  { id: 4, label: "Iris", src: avatar04, group: "bright" },
  { id: 5, label: "Ember", src: avatar05, group: "bright" },
  { id: 6, label: "Orbit", src: avatar06, group: "classic" },
];

export function getAvatarById(avatarId: number | null | undefined) {
  if (avatarId === null || avatarId === undefined) {
    return null;
  }

  return AvatarCatalog.find((avatar) => avatar.id === avatarId) ?? null;
}