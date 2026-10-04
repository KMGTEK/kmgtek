import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { RequestUser } from '../types';

/**
 * Inject the authenticated user (or one of its properties).
 *
 * ```ts
 * findMine(@CurrentUser() user: RequestUser) {}
 * findMine(@CurrentUser('id') userId: string) {}
 * ```
 */
export const CurrentUser = createParamDecorator(
  (key: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user;
    if (!user) return undefined;
    return key ? user[key] : user;
  },
);
