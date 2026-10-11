import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { jobUpsertSchema } from '@kmg/shared';
import { Audit, CurrentUser, Permissions } from '../../common/decorators';
import { ApiDataResponse, ApiPaginatedResponse, ApiZodBody } from '../../common/decorators/swagger.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ok } from '../../common/utils/response.util';
import { JobsService, type AdminJobListQuery, type JobUpsertData } from './jobs.service';

@ApiTags('Admin · Jobs')
@ApiBearerAuth()
@Controller('admin/jobs')
export class JobsAdminController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  @Permissions('jobs:read')
  @ApiOperation({ summary: 'List jobs (admin) with application counts' })
  @ApiPaginatedResponse()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('status') status?: string,
    @Query('departmentId') departmentId?: string,
    @Query('workMode') workMode?: string,
    @Query('employmentType') employmentType?: string,
  ) {
    const query: AdminJobListQuery = {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
      sort,
      status,
      departmentId,
      workMode,
      employmentType,
    };
    return this.jobs.listAdmin(query);
  }

  @Post()
  @Permissions('jobs:write')
  @Audit('job.create', 'Job')
  @ApiZodBody(jobUpsertSchema)
  @ApiOperation({ summary: 'Create a job' })
  async create(
    @Body(new ZodValidationPipe(jobUpsertSchema)) dto: JobUpsertData,
    @CurrentUser('id') userId: string,
  ) {
    return ok(await this.jobs.create(dto, userId));
  }

  @Get(':id')
  @Permissions('jobs:read')
  @ApiOperation({ summary: 'Get a job' })
  @ApiDataResponse({ type: 'object' })
  async get(@Param('id') id: string) {
    return ok(await this.jobs.getAdmin(id));
  }

  @Patch(':id')
  @Permissions('jobs:write')
  @Audit('job.update', 'Job')
  @ApiZodBody(jobUpsertSchema)
  @ApiOperation({ summary: 'Update a job' })
  async update(@Param('id') id: string, @Body(new ZodValidationPipe(jobUpsertSchema)) dto: JobUpsertData) {
    return ok(await this.jobs.update(id, dto));
  }

  @Delete(':id')
  @Permissions('jobs:write')
  @Audit('job.delete', 'Job')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a job (soft delete)' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.jobs.remove(id);
  }

  @Post(':id/duplicate')
  @Permissions('jobs:write')
  @Audit('job.duplicate', 'Job')
  @ApiOperation({ summary: 'Duplicate a job as a new draft' })
  async duplicate(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return ok(await this.jobs.duplicate(id, userId));
  }
}
