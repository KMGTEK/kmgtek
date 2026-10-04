import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Public } from '../../common/decorators';
import { ApiPaginatedResponse, ApiZodQuery, ApiDataResponse } from '../../common/decorators/swagger.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { optionalBooleanQuery } from '../../common/utils/query.util';
import { ok } from '../../common/utils/response.util';
import { CaseStudiesService } from './case-studies.service';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(9),
  industry: z.string().trim().max(120).optional(),
  featured: optionalBooleanQuery,
});
type ListQuery = z.infer<typeof listQuerySchema>;

@ApiTags('Case studies')
@Controller('case-studies')
export class CaseStudiesController {
  constructor(private readonly caseStudies: CaseStudiesService) {}

  @Public()
  @Get()
  @ApiZodQuery(listQuerySchema)
  @ApiOperation({ summary: 'List published case studies' })
  @ApiPaginatedResponse()
  async list(@Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery) {
    return this.caseStudies.listPublic(query);
  }

  @Public()
  @Get(':slug')
  @ApiParam({ name: 'slug' })
  @ApiOperation({ summary: 'Get a published case study by slug' })
  @ApiDataResponse({ type: 'object' })
  async getBySlug(@Param('slug') slug: string) {
    return ok(await this.caseStudies.getPublicBySlug(slug));
  }
}
