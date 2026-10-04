import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ApiErrorBody } from '@kmg/shared';
import type { Request, Response } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';

interface Normalized {
  status: number;
  message: string;
  details?: ApiErrorBody['details'];
  /** Full error to log (never sent to the client). */
  logLevel: 'warn' | 'error';
}

const STATUS_NAMES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  413: 'Payload Too Large',
  415: 'Unsupported Media Type',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

/**
 * Translates every thrown value into the `ApiErrorBody` shape from the contract.
 * Unknown errors never leak stack traces or driver messages to clients.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  constructor(private readonly isProd: boolean) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const { status, message, details, logLevel } = this.normalize(exception);

    const body: ApiErrorBody = {
      statusCode: status,
      error: STATUS_NAMES[status] ?? 'Error',
      message,
      ...(details?.length ? { details } : {}),
      path: request?.originalUrl ?? request?.url ?? '',
      timestamp: new Date().toISOString(),
      requestId: request?.requestId,
    };

    const logMessage = `${request?.method ?? '-'} ${body.path} -> ${status}: ${message}`;
    if (logLevel === 'error') {
      this.logger.error(logMessage, exception instanceof Error ? exception.stack : String(exception));
    } else {
      this.logger.warn(logMessage);
    }

    if (!this.isProd && status >= 500 && exception instanceof Error) {
      (body as ApiErrorBody & { stack?: string }).stack = exception.stack;
    }

    if (response.headersSent) return;
    response.status(status).json(body);
  }

  private normalize(exception: unknown): Normalized {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      let message = exception.message;
      let details: ApiErrorBody['details'];

      if (typeof payload === 'string') {
        message = payload;
      } else if (payload && typeof payload === 'object') {
        const p = payload as Record<string, unknown>;
        if (Array.isArray(p.details)) details = p.details as ApiErrorBody['details'];
        if (Array.isArray(p.message)) {
          details = (p.message as string[]).map((m) => ({ path: '', message: m }));
          message = 'Validation failed';
        } else if (typeof p.message === 'string') {
          message = p.message;
        }
      }
      return { status, message, details, logLevel: status >= 500 ? 'error' : 'warn' };
    }

    if (exception instanceof ZodError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        details: exception.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        logLevel: 'warn',
      };
    }

    if (exception instanceof MulterError) {
      const status =
        exception.code === 'LIMIT_FILE_SIZE' ? HttpStatus.PAYLOAD_TOO_LARGE : HttpStatus.BAD_REQUEST;
      const message =
        exception.code === 'LIMIT_FILE_SIZE'
          ? 'File is too large'
          : exception.code === 'LIMIT_UNEXPECTED_FILE'
            ? `Unexpected file field "${exception.field ?? ''}"`.trim()
            : 'File upload failed';
      return { status, message, logLevel: 'warn' };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrisma(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return { status: HttpStatus.BAD_REQUEST, message: 'Invalid query parameters', logLevel: 'error' };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      logLevel: 'error',
    };
  }

  private fromPrisma(error: Prisma.PrismaClientKnownRequestError): Normalized {
    switch (error.code) {
      case 'P2002': {
        const target = error.meta?.target;
        const fields = Array.isArray(target) ? (target as string[]) : target ? [String(target)] : [];
        return {
          status: HttpStatus.CONFLICT,
          message: fields.length
            ? `A record with this ${fields.join(', ')} already exists`
            : 'Record already exists',
          details: fields.map((f) => ({ path: f, message: 'Already in use' })),
          logLevel: 'warn',
        };
      }
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, message: 'Record not found', logLevel: 'warn' };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Related record does not exist',
          logLevel: 'warn',
        };
      case 'P2000':
        return { status: HttpStatus.BAD_REQUEST, message: 'Value too long for field', logLevel: 'warn' };
      case 'P2014':
        return {
          status: HttpStatus.CONFLICT,
          message: 'Operation would violate a required relation',
          logLevel: 'warn',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database error',
          logLevel: 'error',
        };
    }
  }
}
