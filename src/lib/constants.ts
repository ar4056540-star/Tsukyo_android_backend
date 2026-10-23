export const DEFAULT_AVATAR_URL = '/default-profile.svg';
export const DEFAULT_PROFILE_AVATAR = DEFAULT_AVATAR_URL;
export const OFFICIAL_VYBE_LOGO_URL = '/vybe-logo.svg';

/**
 * Returns a valid avatar image URL, using the official default profile picture if photoURL is missing/empty.
 */
export function getAvatarUrl(photoURL?: string | null): string {
  if (!photoURL || photoURL.trim() === '') {
    return DEFAULT_AVATAR_URL;
  }
  return photoURL;
}
