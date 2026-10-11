import { Body, Controller, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { applicationBulkSchema, applicationStatusUpdateSchema, noteSchema, ratingSchema } from '@kmg/shared';
import type { Response } from 'express';
import { Audit, CurrentUser, Permissions } from '../../common/decorators';
import { ApiDataResponse, ApiPaginatedResponse, ApiZodBody } from '../../common/decorators/swagger.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../../common/types';
import { ok } from '../../common/utils/response.util';
import { UploadsService } from '../uploads/uploads.service';
import {
  ApplicationsService,
  type AdminApplicationListQuery,
  type ApplicationBulkData,
  type ApplicationStatusUpdateData,
  type NoteData,
  type RatingData,
} from './applications.service';

@ApiTags('Admin · Applications')
@ApiBearerAuth()
@Controller('admin/applications')
export class ApplicationsAdminController {
  constructor(
    private readonly applications: ApplicationsService,
    private readonly uploads: UploadsService,
  ) {}

  @Get()
  @Permissions('applications:read')
  @ApiOperation({ summary: 'List applications' })
  @ApiPaginatedResponse()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sort') sort?: string,
    @Query('jobId') jobId?: string,
    @Query('status') status?: string,
    @Query('minRating') minRating?: string,
    @Query('source') source?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const query: AdminApplicationListQuery = {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      sort,
      jobId,
      status,
      minRating: minRating ? Number(minRating) : undefined,
      source,
      from,
      to,
    };
    return this.applications.listAdmin(query);
  }

  @Post('bulk')
  @Permissions('applications:write')
  @Audit('application.bulk', 'JobApplication')
  @ApiZodBody(applicationBulkSchema)
  @ApiOperation({ summary: 'Bulk status change, delete or CSV export' })
  async bulk(@Body(new ZodValidationPipe(applicationBulkSchema)) dto: ApplicationBulkData, @Res() response: Response) {
    const result = await this.applications.bulk(dto);
    if (dto.action === 'export') {
      response.type('text/csv').send(result as string);
      return;
    }
    response.json(ok(result));
  }

  @Get('export')
  @Permissions('applications:read')
  @ApiOperation({ summary: 'Export filtered applications as CSV' })
  async export(
    @Query('jobId') jobId: string | undefined,
    @Query('status') status: string | undefined,
    @Query('minRating') minRating: string | undefined,
    @Query('source') source: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() response: Response,
  ) {
    const csv = await this.applications.exportCsv({
      jobId,
      status,
      minRating: minRating ? Number(minRating) : undefined,
      source,
      from,
      to,
    });
    response.type('text/csv').send(csv);
  }

  @Get(':id')
  @Permissions('applications:read')
  @ApiOperation({ summary: 'Get an application (with notes, interviews, history)' })
  @ApiDataResponse({ type: 'object' })
  async get(@Param('id') id: string) {
    return ok(await this.applications.getAdmin(id));
  }

  @Patch(':id/status')
  @Permissions('applications:write')
  @Audit('application.status_update', 'JobApplication')
  @ApiZodBody(applicationStatusUpdateSchema)
  @ApiOperation({ summary: 'Change application status' })
  async updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(applicationStatusUpdateSchema)) dto: ApplicationStatusUpdateData,
    @CurrentUser('id') actorId: string,
  ) {
    return ok(await this.applications.updateStatus(id, dto, actorId));
  }

  @Patch(':id/rating')
  @Permissions('applications:write')
  @Audit('application.rating_update', 'JobApplication')
  @ApiZodBody(ratingSchema)
  @ApiOperation({ summary: 'Rate an application' })
  async updateRating(@Param('id') id: string, @Body(new ZodValidationPipe(ratingSchema)) dto: RatingData) {
    return ok(await this.applications.updateRating(id, dto));
  }

  @Post(':id/notes')
  @Permissions('applications:write')
  @Audit('application.note_create', 'JobApplication')
  @ApiZodBody(noteSchema)
  @ApiOperation({ summary: 'Add an internal note' })
  async addNote(@Param('id') id: string, @CurrentUser('id') authorId: string, @Body(new ZodValidationPipe(noteSchema)) dto: NoteData) {
    return ok(await this.applications.addNote(id, authorId, dto));
  }

  @Get(':id/resume')
  @Permissions('applications:read')
  @ApiOperation({ summary: 'Redirect to a signed URL for the resume' })
  async resume(
    @Param('id') id: string,
    @Query('download') download: string | undefined,
    @CurrentUser() user: RequestUser,
    @Res() response: Response,
  ): Promise<void> {
    const fileId = await this.applications.getResumeFileId(id);
    const url = await this.uploads.resolveUrl(fileId, user, { download: download === '1' });
    response.redirect(302, url);
  }
}
