import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'kmg:audit';

export interface AuditMetadata {
  /** `<entity>.<verb>`, e.g. `job.update`. */
  action: string;
  entityType: string;
  /** Route param holding the entity id (default: `id`). */
  idParam?: string;
}

/**
 * Record an `AuditLog` row after a successful admin mutation.
 *
 * ```ts
 * @Audit('job.update', 'Job')
 * @Patch(':id')
 * update() {}
 * ```
 */
export const Audit = (action: string, entityType?: string, idParam = 'id') =>
  SetMetadata(AUDIT_KEY, {
    action,
    entityType: entityType ?? action.split('.')[0],
    idParam,
  } satisfies AuditMetadata);
