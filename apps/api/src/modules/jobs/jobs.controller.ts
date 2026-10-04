import { Body, Controller, Get, Param, Post, Query, Req, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { jobApplicationSchema, jobsQuerySchema, type JobsQuery } from '@kmg/shared';
import type { Request } from 'express';
import { CurrentUser, OptionalAuth, Public, RateLimit } from '../../common/decorators';
import { ApiDataResponse, ApiPaginatedResponse, ApiZodBody, ApiZodQuery } from '../../common/decorators/swagger.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../../common/types';
import { ok } from '../../common/utils/response.util';
import { JobsService, type JobApplicationData, type JobApplicationFiles } from './jobs.service';

@ApiTags('Public · Jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published, open jobs' })
  @ApiZodQuery(jobsQuerySchema)
  @ApiPaginatedResponse()
  list(@Query(new ZodValidationPipe(jobsQuerySchema)) query: JobsQuery) {
    return this.jobs.listPublic(query);
  }

  @Public()
  @Get('facets')
  @ApiOperation({ summary: 'Distinct locations/departments/skills for job filters' })
  @ApiDataResponse({ type: 'object' })
  async facets() {
    return ok(await this.jobs.facets());
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Job detail (increments views) with similar roles' })
  @ApiDataResponse({ type: 'object' })
  async getBySlug(@Param('slug') slug: string) {
    return ok(await this.jobs.getBySlugPublic(slug));
  }

  @OptionalAuth()
  @RateLimit(5, 60)
  @Post(':slug/apply')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'resume', maxCount: 1 }, { name: 'coverLetter', maxCount: 1 }]))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        resume: { type: 'string', format: 'binary' },
        coverLetter: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiZodBody(jobApplicationSchema)
  @ApiOperation({ summary: 'Apply to a job (optionally authenticated as a candidate)' })
  @ApiDataResponse({
    type: 'object',
    properties: { applicationId: { type: 'string' }, candidateAccountCreated: { type: 'boolean' } },
  })
  async apply(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(jobApplicationSchema)) dto: JobApplicationData,
    @UploadedFiles() files: JobApplicationFiles,
    @CurrentUser() user: RequestUser | undefined,
    @Req() request: Request,
  ) {
    return ok(await this.jobs.apply(slug, dto, files ?? {}, user, request));
  }
}
