import { SetMetadata } from '@nestjs/common';
import type { RoleName } from '@kmg/shared';

export const ROLES_KEY = 'kmg:roles';

/** Require the caller to hold at least one of the given roles. */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
