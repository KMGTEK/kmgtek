import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import type { Request } from 'express';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { ConfigModule, AppConfigService } from '../../config/config.module';

/**
 * Structured logging. Pretty-printed in development, single-line JSON in production.
 * Authorization headers, cookies and password fields are redacted everywhere.
 */
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        pinoHttp: {
          level: config.isTest ? 'silent' : config.logLevel,
          genReqId: (incoming: IncomingMessage, res: ServerResponse) => {
            const req = incoming as IncomingMessage & Request;
            const id = req.requestId ?? (req.headers['x-request-id'] as string) ?? randomUUID();
            req.requestId = id;
            res.setHeader('X-Request-Id', id);
            return id;
          },
          autoLogging: {
            ignore: (req: IncomingMessage) => {
              const url = req.url ?? '';
              return url.startsWith('/health') || url.startsWith('/api/docs');
            },
          },
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
              'req.body.password',
              'req.body.newPassword',
              'req.body.currentPassword',
              'req.body.confirmPassword',
              'req.body.token',
            ],
            censor: '[redacted]',
          },
          customProps: (incoming: IncomingMessage) => {
            const req = incoming as IncomingMessage & Request;
            return { requestId: req.requestId, userId: req.user?.id };
          },
          transport: config.isProd || config.isTest
            ? undefined
            : {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                  colorize: true,
                  translateTime: 'SYS:HH:MM:ss',
                  ignore: 'pid,hostname,req.headers,res.headers',
                },
              },
        },
      }),
    }),
  ],
})
export class LoggerModule {}
