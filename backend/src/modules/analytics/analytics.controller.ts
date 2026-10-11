import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators';
import { ApiDataResponse } from '../../common/decorators/swagger.decorators';
import { ok } from '../../common/utils/response.util';
import { AnalyticsService } from './analytics.service';

@ApiTags('Admin · Analytics')
@ApiBearerAuth()
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get()
  @Permissions('analytics:read')
  @ApiOperation({ summary: 'Website + recruitment analytics report' })
  @ApiDataResponse({ type: 'object' })
  async report(@Query('from') from?: string, @Query('to') to?: string) {
    return ok(await this.analytics.report({ from, to }));
  }
}
