/**
 * Permission utilities for Vivardhaa.
 *
 * Session is now JWT-based. The token is stored in localStorage under "vv_token"
 * (managed by api.ts). We decode the payload locally to read user info —
 * no secret needed client-side, just base64 decode.
 */

import { getToken, setToken } from "./api";

export interface SessionUser {
  id: string;
  name: string;
  phone: string;
  isAdmin: boolean;
  /** ['*'] = all menus; specific nav item paths otherwise */
  menuItems: string[];
}

function decodeJwtPayload(token: string): SessionUser | null {
  try {
    const payloadBase64 = token.split(".")[1];
    const decoded = JSON.parse(atob(payloadBase64));
    return {
      id: decoded.sub,
      name: decoded.name,
      phone: decoded.phone,
      isAdmin: decoded.isAdmin,
      menuItems: decoded.menuItems,
    };
  } catch {
    return null;
  }
}

/** Store JWT token (login) or clear it (logout) */
export function setSessionUser(token: string | null) {
  setToken(token);
}

/** Read current session user from the JWT payload. null = no session. */
export function getSessionUser(): SessionUser | null {
  const token = getToken();
  if (!token) return null;
  return decodeJwtPayload(token);
}

/**
 * Check whether the current user can access a menu item by its path.
 * Returns true when:
 *  - no session (dev mode — full access)
 *  - menuItems: ['*'] (Admin)
 *  - menuItems includes the given path
 */
export function canAccessMenu(menuPath: string): boolean {
  const user = getSessionUser();
  if (!user) return true;
  if (user.menuItems.includes("*")) return true;
  return user.menuItems.includes(menuPath);
}
