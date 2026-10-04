import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators';
import { ApiDataResponse } from '../../common/decorators/swagger.decorators';
import { ok } from '../../common/utils/response.util';
import { DashboardService } from './dashboard.service';

@ApiTags('Admin · Dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  @Permissions('dashboard:read')
  @ApiOperation({ summary: 'High-level KPI summary' })
  @ApiDataResponse({ type: 'object' })
  async summary() {
    return ok(await this.dashboard.summary());
  }

  @Get('charts')
  @Permissions('dashboard:read')
  @ApiOperation({ summary: 'Time series + funnel data for dashboard charts' })
  @ApiDataResponse({ type: 'object' })
  async charts(@Query('months') months?: string) {
    return ok(await this.dashboard.charts(months ? Number(months) : undefined));
  }
}
