export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  sellerStatus?: string | null;
};

const TOKEN_KEY = 'therynox_access_token';
const USER_KEY = 'therynox_user';
const LEGACY_TOKEN_KEYS = ['therynox_admin_token', 'therynox_seller_token'];

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = window.sessionStorage.getItem(TOKEN_KEY);
  // Migrate old builds' role-specific keys to one canonical session key.
  if (!token) {
    const legacy = LEGACY_TOKEN_KEYS.map(key => window.sessionStorage.getItem(key)).find(Boolean);
    if (legacy) window.sessionStorage.setItem(TOKEN_KEY, legacy);
    for (const key of LEGACY_TOKEN_KEYS) window.sessionStorage.removeItem(key);
    return legacy || null;
  }
  for (const key of LEGACY_TOKEN_KEYS) window.sessionStorage.removeItem(key);
  return token;
}

export function saveAuthSession(accessToken: string, user: SessionUser): void {
  window.sessionStorage.setItem(TOKEN_KEY, accessToken);
  window.sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  for (const key of LEGACY_TOKEN_KEYS) window.sessionStorage.removeItem(key);
}

export function clearAuthSession(): void {
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(USER_KEY);
  for (const key of LEGACY_TOKEN_KEYS) window.sessionStorage.removeItem(key);
}
