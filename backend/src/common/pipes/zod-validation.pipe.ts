import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { z } from 'zod';

/**
 * Validate (and coerce) a request payload with a zod schema from `@kmg/shared`.
 *
 * ```ts
 * @Post()
 * create(@Body(new ZodValidationPipe(jobUpsertSchema)) dto: JobUpsertData) {}
 *
 * @Get()
 * list(@Query(new ZodValidationPipe(jobsQuerySchema)) query: JobsQuery) {}
 * ```
 *
 * Failures become `400` with `details: [{ path, message }]`, per the API contract.
 */
@Injectable()
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return result.data;
  }
}

/** Functional helper for validating values outside of the request pipeline. */
export function validateWith<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  return new ZodValidationPipe(schema).transform(value);
}
