import { Module } from '@nestjs/common';
import { AdminTechnologiesController, AdminTechnologyCategoriesController } from './admin-technologies.controller';
import { TechnologiesController } from './technologies.controller';
import { TechnologiesService } from './technologies.service';

@Module({
  controllers: [TechnologiesController, AdminTechnologyCategoriesController, AdminTechnologiesController],
  providers: [TechnologiesService],
  exports: [TechnologiesService],
})
export class TechnologiesModule {}
