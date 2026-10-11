import { Global, Module } from '@nestjs/common';
import { AppConfigService } from '../../config/config.module';
import { LocalStorageDriver } from './local-storage.driver';
import { S3StorageDriver } from './s3-storage.driver';
import { StorageService } from './storage.service';

/** Selects the storage driver from `STORAGE_DRIVER` (local | s3). */
@Global()
@Module({
  providers: [
    LocalStorageDriver,
    {
      provide: StorageService,
      inject: [AppConfigService, LocalStorageDriver],
      useFactory: (config: AppConfigService, local: LocalStorageDriver): StorageService =>
        config.storage.driver === 's3' ? new S3StorageDriver(config) : local,
    },
  ],
  exports: [StorageService, LocalStorageDriver],
})
export class StorageModule {}
