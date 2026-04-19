const USER_ID_KEY = "fantomchat_user_uuid";

export function deriveDisplayNameFromUserId(userId: string): string {
  if (!userId) return "Unknown";
  const segments = userId.split("_");
  return `User ${segments[1] || userId.substring(0, 5)}`;
}

/**
 * Gets or creates a persistent unique ID for this browser session.
 */
export function getPersistentUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    // Simple random ID generator (no external dependencies needed)
    userId = `user_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

export function getPersistentUserName(): string {
  return deriveDisplayNameFromUserId(getPersistentUserId());
}
