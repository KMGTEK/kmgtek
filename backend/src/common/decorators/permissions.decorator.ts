import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@kmg/shared';

export const PERMISSIONS_KEY = 'kmg:permissions';

/**
 * Require the caller to hold *all* listed permissions. SUPER_ADMIN always passes.
 *
 * ```ts
 * @Permissions('jobs:write')
 * @Patch(':id')
 * update() {}
 * ```
 */
export const Permissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
