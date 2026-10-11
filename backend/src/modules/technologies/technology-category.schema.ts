import { coercedNumber, slugSchema } from '@kmg/shared';
import { z } from 'zod';

/**
 * `TechnologyCategory` has no matching schema in `@kmg/shared` (only individual
 * technologies do) — this tiny shape is local to the module.
 */
export const technologyCategoryUpsertSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema.optional(),
  order: coercedNumber(z.number().int()).default(0),
});
export type TechnologyCategoryUpsertData = z.infer<typeof technologyCategoryUpsertSchema>;
