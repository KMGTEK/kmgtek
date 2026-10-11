import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MulterError } from 'multer';
import { z } from 'zod';
import type { ApiErrorBody } from '@kmg/shared';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';

function buildHost() {
  const json = jest.fn();
  const response = { status: jest.fn().mockReturnValue({ json }), headersSent: false };
  const request = {
    method: 'POST',
    originalUrl: '/api/v1/admin/jobs',
    url: '/api/v1/admin/jobs',
    requestId: 'req-123',
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }),
  };
  return { host, response, json };
}

function capture(exception: unknown, isProd = true): ApiErrorBody {
  const { host, response, json } = buildHost();
  new AllExceptionsFilter(isProd).catch(exception, host as never);
  expect(response.status).toHaveBeenCalled();
  return json.mock.calls[0][0] as ApiErrorBody;
}

describe('AllExceptionsFilter', () => {
  it('maps HttpExceptions and always includes the request context', () => {
    const body = capture(new NotFoundException('Job not found'));
    expect(body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      message: 'Job not found',
      path: '/api/v1/admin/jobs',
      requestId: 'req-123',
    });
    expect(typeof body.timestamp).toBe('string');
  });

  it('keeps validation details from the ZodValidationPipe', () => {
    const body = capture(
      new BadRequestException({
        message: 'Validation failed',
        details: [{ path: 'title', message: 'Too short' }],
      }),
    );
    expect(body.statusCode).toBe(400);
    expect(body.details).toEqual([{ path: 'title', message: 'Too short' }]);
  });

  it('converts a raw ZodError into a 400 with details', () => {
    const schema = z.object({ email: z.email(), age: z.number().min(18) });
    const result = schema.safeParse({ email: 'nope', age: 12 });
    const body = capture(result.success ? new Error('unreachable') : result.error);

    expect(body.statusCode).toBe(400);
    expect(body.message).toBe('Validation failed');
    expect(body.details?.map((d) => d.path).sort()).toEqual(['age', 'email']);
  });

  it('maps Prisma P2002 to 409 with the conflicting field', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['slug'] },
    });
    const body = capture(error);
    expect(body.statusCode).toBe(409);
    expect(body.message).toMatch(/slug/);
    expect(body.details).toEqual([{ path: 'slug', message: 'Already in use' }]);
  });

  it('maps Prisma P2025 to 404', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Not found', {
      code: 'P2025',
      clientVersion: '6.19.3',
    });
    expect(capture(error).statusCode).toBe(404);
  });

  it('maps Multer size errors to 413', () => {
    const body = capture(new MulterError('LIMIT_FILE_SIZE', 'file'));
    expect(body.statusCode).toBe(413);
    expect(body.message).toBe('File is too large');
  });

  it('never leaks internals for unknown errors in production', () => {
    const body = capture(new Error('connect ECONNREFUSED 10.0.0.4:5432 password=hunter2'));
    expect(body.statusCode).toBe(500);
    expect(body.message).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toMatch(/hunter2|ECONNREFUSED/);
    expect((body as ApiErrorBody & { stack?: string }).stack).toBeUndefined();
  });

  it('includes a stack for 500s outside production to aid local debugging', () => {
    const body = capture(new Error('boom'), false) as ApiErrorBody & { stack?: string };
    expect(body.statusCode).toBe(500);
    expect(body.stack).toContain('Error: boom');
  });

  it('preserves the status of authorization failures', () => {
    expect(capture(new ForbiddenException('Missing permission: jobs:write')).statusCode).toBe(403);
  });
});
