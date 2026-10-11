import { z } from 'zod';

/** Parse a `?flag=true|false` query string into an optional boolean. */
export const optionalBooleanQuery = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === 'true'));
