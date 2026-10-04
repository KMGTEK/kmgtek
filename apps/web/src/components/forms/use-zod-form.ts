'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type FieldValues, type UseFormProps, type UseFormReturn } from 'react-hook-form';
import type { ZodType } from 'zod';

import { isApiError } from '@/lib/api/client';

/**
 * React Hook Form + a zod schema from `@kmg/shared`.
 *
 * ```ts
 * const form = useZodForm(loginSchema, { defaultValues: { email: '', password: '' } });
 * ```
 */
export function useZodForm<TSchema extends ZodType>(
  schema: TSchema,
  options?: Omit<UseFormProps<TSchema['_input'] extends FieldValues ? TSchema['_input'] : FieldValues>, 'resolver'>,
): UseFormReturn<TSchema['_input'] extends FieldValues ? TSchema['_input'] : FieldValues> {
  type Values = TSchema['_input'] extends FieldValues ? TSchema['_input'] : FieldValues;
  return useForm<Values>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any) as any,
    mode: 'onTouched',
    ...options,
  });
}

/**
 * Map an `ApiError`'s `details` onto form fields, returning the message that could not be
 * attached to a field (show it as a toast or an alert).
 *
 * ```ts
 * catch (error) { toast.error(applyApiErrorToForm(error, form)); }
 * ```
 */
export function applyApiErrorToForm<TValues extends FieldValues>(
  error: unknown,
  form: UseFormReturn<TValues>,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (!isApiError(error)) return error instanceof Error ? error.message : fallback;

  const fieldErrors = error.fieldErrors;
  const names = Object.keys(fieldErrors);
  if (names.length === 0) return error.message || fallback;

  for (const name of names) {
    form.setError(name as Parameters<typeof form.setError>[0], {
      type: 'server',
      message: fieldErrors[name],
    });
  }
  return error.message || 'Please fix the highlighted fields.';
}
