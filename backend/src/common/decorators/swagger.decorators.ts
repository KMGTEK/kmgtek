import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiOkResponse, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';

/** Convert a zod 4 schema into an OpenAPI-compatible JSON Schema object. */
export function zodToOpenApi(schema: z.ZodType): Record<string, any> {
  const json = z.toJSONSchema(schema, {
    io: 'input',
    unrepresentable: 'any',
    reused: 'inline',
  }) as Record<string, any>;
  delete json.$schema;
  return json;
}

/**
 * Document a request body validated by a zod schema from `@kmg/shared`.
 *
 * ```ts
 * @ApiZodBody(loginSchema)
 * @Post('login')
 * login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginInput) {}
 * ```
 */
export const ApiZodBody = (schema: z.ZodType, description?: string) =>
  ApiBody({ description, schema: zodToOpenApi(schema) as any });

/** Document query parameters described by a zod object schema. */
export function ApiZodQuery(schema: z.ZodType): MethodDecorator {
  const json = zodToOpenApi(schema);
  const required: string[] = json.required ?? [];
  const decorators = Object.entries(json.properties ?? {}).map(([name, prop]) =>
    ApiQuery({
      name,
      required: required.includes(name),
      schema: prop as any,
    }),
  );
  return applyDecorators(...decorators);
}

/** `{ data: T }` envelope for a single resource. */
export const ApiDataResponse = (schema: Record<string, any>, description = 'Success') =>
  ApiOkResponse({
    description,
    schema: { type: 'object', properties: { data: schema }, required: ['data'] },
  });

export const PAGINATION_META_SCHEMA = {
  type: 'object',
  properties: {
    page: { type: 'integer' },
    pageSize: { type: 'integer' },
    total: { type: 'integer' },
    totalPages: { type: 'integer' },
  },
  required: ['page', 'pageSize', 'total', 'totalPages'],
};

/** `{ data: T[], meta: PaginationMeta }` envelope for list endpoints. */
export const ApiPaginatedResponse = (itemSchema: Record<string, any> = { type: 'object' }, description = 'Success') =>
  ApiOkResponse({
    description,
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: itemSchema },
        meta: PAGINATION_META_SCHEMA,
      },
      required: ['data', 'meta'],
    },
  });

const ERROR_SCHEMA = {
  type: 'object',
  properties: {
    statusCode: { type: 'integer' },
    error: { type: 'string' },
    message: { type: 'string' },
    details: {
      type: 'array',
      items: {
        type: 'object',
        properties: { path: { type: 'string' }, message: { type: 'string' } },
      },
    },
    path: { type: 'string' },
    timestamp: { type: 'string', format: 'date-time' },
    requestId: { type: 'string' },
  },
} as const;

/** Standard error responses every documented endpoint should declare. */
export const ApiStandardErrors = () =>
  applyDecorators(
    ApiResponse({ status: 400, description: 'Validation failed', schema: ERROR_SCHEMA as any }),
    ApiResponse({ status: 500, description: 'Unexpected error', schema: ERROR_SCHEMA as any }),
  );

export { ApiExtraModels };
