import { avatarCatalog, getAvatarDef, type AvatarDef } from '../constants/avatars';

const DEFAULT_AVATAR = '🧙‍♂️';

/**
 * Returns the display emoji for a given avatar ID.
 * Uses avatarCatalog as single source of truth.
 * Falls back to the default wizard emoji for null/undefined,
 * or returns the raw string for backwards-compat (plain emoji values).
 */
export function getAvatarImage(avatarId: string | undefined | null): string {
  if (!avatarId) return DEFAULT_AVATAR;
  const def = getAvatarDef(avatarId);
  if (def) return def.icon;
  // Backwards-compat: if the value is already an emoji, return as-is
  return avatarId;
}

/**
 * Returns the full avatar definition for an active avatar,
 * or undefined if not found in catalog.
 */
export function getActiveAvatarDef(avatarId: string | undefined | null): AvatarDef | undefined {
  if (!avatarId) return undefined;
  return getAvatarDef(avatarId);
}

/**
 * Given owned + level-unlocked arrays, return all unique avatar IDs the user can use.
 */
export function getAllAvailableAvatars(
  ownedAvatars: string[],
  levelUnlockedAvatars: string[],
): string[] {
  const set = new Set([...ownedAvatars, ...levelUnlockedAvatars]);
  // Preserve catalog order
  return avatarCatalog.filter((a) => set.has(a.id)).map((a) => a.id);
}
