import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators';
import { ApiPaginatedResponse } from '../../common/decorators/swagger.decorators';
import { AuditService, type AuditListQuery } from './audit.service';

@ApiTags('Admin · Audit')
@ApiBearerAuth()
@Controller('admin/audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @Permissions('audit:read')
  @ApiOperation({ summary: 'List admin activity (audit trail)' })
  @ApiPaginatedResponse()
  list(@Query() query: AuditListQuery) {
    return this.audit.list(query);
  }
}
