/**
 * UserManagementGuard
 *
 * A lightweight request-level guard that checks whether the caller has
 * permission to access the user-management endpoints.
 *
 * In the current phase (before a full JWT auth layer) this guard reads an
 * optional "X-Role-Permissions" header that the frontend can send once a
 * proper session is established.  If the header is absent the guard passes —
 * this preserves backward compatibility during development where the owner
 * accesses the API directly.
 *
 * When JWT auth is added later, replace the header check with a JWT decode +
 * roles lookup.  No controller or service code needs to change.
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class UserManagementGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const permHeader = req.headers['x-role-permissions'];

    // No header → dev/owner mode, pass through
    if (!permHeader) return true;

    try {
      const perms = JSON.parse(permHeader as string);
      if (!perms?.userManagement?.view) {
        throw new ForbiddenException(
          'You do not have permission to access user management.',
        );
      }
      return true;
    } catch (e) {
      if (e instanceof ForbiddenException) throw e;
      // Malformed header — fail open in dev, fail closed in prod
      return process.env.NODE_ENV !== 'production';
    }
  }
}
