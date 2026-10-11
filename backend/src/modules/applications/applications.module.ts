import { Module } from '@nestjs/common';
import { CandidatesModule } from '../candidates/candidates.module';
import { ApplicationsAdminController } from './applications-admin.controller';
import { ApplicationsService } from './applications.service';
import { ApplicationsMeController } from './applications.controller';

@Module({
  imports: [CandidatesModule],
  controllers: [ApplicationsMeController, ApplicationsAdminController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
