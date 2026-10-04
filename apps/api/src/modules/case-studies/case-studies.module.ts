import { Module } from '@nestjs/common';
import { AdminCaseStudiesController } from './admin-case-studies.controller';
import { CaseStudiesController } from './case-studies.controller';
import { CaseStudiesService } from './case-studies.service';

@Module({
  controllers: [CaseStudiesController, AdminCaseStudiesController],
  providers: [CaseStudiesService],
  exports: [CaseStudiesService],
})
export class CaseStudiesModule {}
