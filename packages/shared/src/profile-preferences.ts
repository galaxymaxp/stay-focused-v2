import { ORB_IDLE_PALETTE, type OrbColorKey } from './orb-interaction';

export interface ProfilePreferences { readonly orbColor: OrbColorKey }
export type ProfilePreferencesPatch = ProfilePreferences;
export const PROFILE_PREFERENCES_UNAVAILABLE = 'profile_preferences_unavailable';
export function isOrbColorKey(value: unknown): value is OrbColorKey {
  return ORB_IDLE_PALETTE.some(color => color.key === value);
}
export function parseProfilePreferences(value: unknown): ProfilePreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== 1 || !('orbColor' in value) || !isOrbColorKey(value.orbColor)) {
    throw new Error('invalid_profile_preferences');
  }
  return { orbColor: value.orbColor };
}
