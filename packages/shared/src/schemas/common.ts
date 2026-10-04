import { z } from 'zod';

export const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

/**
 * These are built with `z.union([literal(''), ...]).optional().transform(...)` rather than
 * `z.preprocess(emptyToUndefined, schema.optional())`. The preprocess form type-checks fine on
 * its own, but zod 4 infers its output as `unknown`/`{}` almost everywhere it's *used* (object
 * shapes, `z.input`/`z.infer`), which breaks assignment to Prisma's typed inputs across every
 * consumer. This form keeps the same runtime behavior (blank string -> undefined) with a clean,
 * concrete inferred output type (`string | undefined`).
 */
export const optionalUrl = z
  .union([z.literal(''), z.url('Enter a valid URL').max(500)])
  .optional()
  .transform((v): string | undefined => (v === '' || v === undefined ? undefined : v));

export const optionalString = (max = 255) =>
  z
    .union([z.literal(''), z.string().trim().max(max)])
    .optional()
    .transform((v): string | undefined => (v === '' || v === undefined ? undefined : v));

/**
 * Same underlying issue as `optionalString` above, but for `z.coerce.number()`/`z.coerce.date()`:
 * they infer as `{}` inside object shapes in this zod/TS combination. These helpers accept
 * string or number/date input (form fields, query strings) and pipe into a concrete schema,
 * which keeps a clean, concrete inferred output type.
 */
export const coercedNumber = (schema: z.ZodNumber = z.number()) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === 'string' ? Number(v) : v))
    .pipe(schema);

export const optionalCoercedNumber = (schema: z.ZodNumber = z.number()) =>
  z
    .union([z.literal(''), z.string(), z.number(), z.null()])
    .optional()
    .transform((v): number | undefined => {
      if (v === '' || v === null || v === undefined) return undefined;
      return typeof v === 'string' ? Number(v) : v;
    })
    .pipe(schema.optional());

export const coercedDate = (schema: z.ZodDate = z.date()) =>
  z
    .union([z.string(), z.date()])
    .transform((v) => (typeof v === 'string' ? new Date(v) : v))
    .pipe(schema);

export const optionalCoercedDate = () =>
  z
    .union([z.literal(''), z.string(), z.date(), z.null()])
    .optional()
    .transform((v): Date | undefined => {
      if (v === '' || v === null || v === undefined) return undefined;
      return typeof v === 'string' ? new Date(v) : v;
    });

export const phoneSchema = z
  .string()
  .trim()
  .min(7, 'Enter a valid phone number')
  .max(20, 'Enter a valid phone number')
  .regex(/^[+()\-\s\d.]+$/, 'Enter a valid phone number');

export const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .max(128)
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/\d/, 'Include a number');

export const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, numbers and hyphens only');

export const paginationSchema = z.object({
  page: coercedNumber(z.number().int().min(1)).default(1),
  pageSize: coercedNumber(z.number().int().min(1).max(100)).default(12),
  search: optionalString(200),
  sort: optionalString(60),
});
export type PaginationInput = z.infer<typeof paginationSchema>;

export const idSchema = z.string().min(1).max(64);
