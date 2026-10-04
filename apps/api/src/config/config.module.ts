import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { join } from 'node:path';
import { buildConfig, type AppConfig } from './configuration';

/**
 * Typed application configuration. Inject it anywhere:
 *
 * ```ts
 * constructor(private readonly config: AppConfigService) {}
 * // this.config.jwt.accessSecret, this.config.isProd, ...
 * ```
 */
export class AppConfigService {
  constructor(config: AppConfig) {
    Object.assign(this, config);
  }
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AppConfigService extends AppConfig {}

/** apps/api/.env wins, the monorepo root .env fills in the gaps. */
export const ENV_FILES = [
  join(process.cwd(), '.env'),
  join(__dirname, '..', '..', '.env'),
  join(__dirname, '..', '..', '..', '..', '.env'),
];

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ENV_FILES,
    }),
  ],
  providers: [
    {
      provide: AppConfigService,
      useFactory: () => new AppConfigService(buildConfig()),
    },
  ],
  exports: [AppConfigService],
})
export class ConfigModule {}
