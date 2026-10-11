import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES, type Permission } from '@kmg/shared';
import type { Request } from 'express';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

/** Global guard enforcing `@Permissions(...)`. SUPER_ADMIN bypasses every check. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;

    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const user = context.switchToHttp().getRequest<Request>().user;
    if (!user) throw new ForbiddenException('Authentication required');
    if (user.roles.includes(ROLES.SUPER_ADMIN)) return true;

    const missing = required.filter((permission) => !user.permissions.includes(permission));
    if (missing.length) {
      throw new ForbiddenException(`Missing permission: ${missing.join(', ')}`);
    }
    return true;
  }
}
