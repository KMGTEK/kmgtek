import { Module } from '@nestjs/common';
import { JobsAdminController } from './jobs-admin.controller';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  controllers: [JobsController, JobsAdminController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
