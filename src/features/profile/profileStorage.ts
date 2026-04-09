export const PROFILE_STORAGE_KEY = "phantomchat_profile";

export type StoredProfile = {
  displayName: string;
  avatarId: number | null;
};

export function loadStoredProfile(): StoredProfile {
  if (typeof localStorage === "undefined") {
    return { displayName: "", avatarId: null };
  }

  const rawProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!rawProfile) {
    return { displayName: "", avatarId: null };
  }

  try {
    const parsed = JSON.parse(rawProfile) as Partial<StoredProfile>;
    return {
      displayName:
        typeof parsed.displayName === "string" ? parsed.displayName : "",
      avatarId: typeof parsed.avatarId === "number" ? parsed.avatarId : null,
    };
  } catch {
    return { displayName: "", avatarId: null };
  }
}

export function saveStoredProfile(profile: StoredProfile) {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}
