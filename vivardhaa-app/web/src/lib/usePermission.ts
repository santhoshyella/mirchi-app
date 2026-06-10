import { canAccessMenu } from "./permissions";

/**
 * Returns whether the current user can access a given menu path.
 *
 * Usage:
 *   const canViewPurchase = usePermission("/purchase");
 *   const canViewSetup = usePermission("/setup/varieties");
 *
 * Returns true when no session is active (dev / Admin mode).
 */
export function usePermission(menuPath: string): boolean {
  return canAccessMenu(menuPath);
}
