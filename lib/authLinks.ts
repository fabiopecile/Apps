import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

/**
 * Where Supabase should send someone after they tap the password-reset link.
 *
 * On web that's a normal URL on whatever host the app is served from; on a
 * device it's the `teamup11://` deep link declared in app.json. Both have to
 * be listed under Authentication -> URL Configuration -> Redirect URLs in the
 * Supabase dashboard, otherwise Supabase drops the redirect.
 */
export function passwordResetRedirectUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/reset-password`;
  }
  return Linking.createURL('/reset-password');
}

/**
 * Pulls the recovery tokens out of a deep link. Supabase puts them in the
 * fragment (`#access_token=...`), which `Linking.parse` ignores, so they're
 * read by hand here.
 */
export function parseAuthTokens(url: string): { accessToken: string; refreshToken: string } | null {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return null;
  const params = new URLSearchParams(url.slice(hashIndex + 1));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}
