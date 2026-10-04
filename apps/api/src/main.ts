import 'reflect-metadata';
import { Logger as NestLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { API_GLOBAL_PREFIX, configureApp, setupSwagger } from './bootstrap';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const config = configureApp(app);
  setupSwagger(app, config);

  await app.listen(config.port, '0.0.0.0');

  const logger = new NestLogger('Bootstrap');
  logger.log(`API listening on http://localhost:${config.port}/${API_GLOBAL_PREFIX} (${config.env})`);
  logger.log(`Swagger UI at http://localhost:${config.port}/api/docs`);
}

void bootstrap();
