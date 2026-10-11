import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { caseStudyUpsertSchema } from '@kmg/shared';
import { Audit, Permissions } from '../../common/decorators';
import { ApiDataResponse, ApiZodBody } from '../../common/decorators/swagger.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ok } from '../../common/utils/response.util';
import { CaseStudiesService, type CaseStudyUpsertData } from './case-studies.service';

@ApiTags('Admin · Case studies')
@ApiBearerAuth()
@Controller('admin/case-studies')
export class AdminCaseStudiesController {
  constructor(private readonly caseStudies: CaseStudiesService) {}

  @Get()
  @Permissions('content:read')
  @ApiOperation({ summary: 'List all case studies (including unpublished)' })
  @ApiDataResponse({ type: 'array', items: { type: 'object' } })
  async list() {
    return ok(await this.caseStudies.listAdmin());
  }

  @Post()
  @Permissions('content:write')
  @Audit('case_study.create', 'CaseStudy')
  @ApiZodBody(caseStudyUpsertSchema)
  @ApiOperation({ summary: 'Create a case study' })
  @ApiDataResponse({ type: 'object' })
  async create(@Body(new ZodValidationPipe(caseStudyUpsertSchema)) dto: CaseStudyUpsertData) {
    return ok(await this.caseStudies.create(dto));
  }

  @Get(':id')
  @Permissions('content:read')
  @ApiOperation({ summary: 'Get one case study by id' })
  @ApiDataResponse({ type: 'object' })
  async get(@Param('id') id: string) {
    return ok(await this.caseStudies.getAdmin(id));
  }

  @Patch(':id')
  @Permissions('content:write')
  @Audit('case_study.update', 'CaseStudy')
  @ApiZodBody(caseStudyUpsertSchema)
  @ApiOperation({ summary: 'Update a case study' })
  @ApiDataResponse({ type: 'object' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(caseStudyUpsertSchema)) dto: CaseStudyUpsertData,
  ) {
    return ok(await this.caseStudies.update(id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('content:write')
  @Audit('case_study.delete', 'CaseStudy')
  @ApiOperation({ summary: 'Delete a case study' })
  async remove(@Param('id') id: string) {
    await this.caseStudies.delete(id);
  }
}
