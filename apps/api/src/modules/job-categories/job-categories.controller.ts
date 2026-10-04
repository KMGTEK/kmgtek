import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Audit, Permissions } from '../../common/decorators';
import { ApiDataResponse, ApiZodBody } from '../../common/decorators/swagger.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ok } from '../../common/utils/response.util';
import { slugSchema } from '@kmg/shared';
import { JobCategoriesService } from './job-categories.service';

const jobCategoryUpsertSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema.optional(),
});

@ApiTags('Admin · Job categories')
@ApiBearerAuth()
@Controller('admin/job-categories')
export class JobCategoriesController {
  constructor(private readonly categories: JobCategoriesService) {}

  @Get()
  @Permissions('jobs:read')
  @ApiOperation({ summary: 'List departments (with job counts)' })
  @ApiDataResponse({ type: 'array', items: { type: 'object' } })
  async list() {
    return ok(await this.categories.list());
  }

  @Post()
  @Permissions('jobs:write')
  @Audit('job-category.create', 'JobCategory')
  @ApiZodBody(jobCategoryUpsertSchema)
  @ApiOperation({ summary: 'Create a department' })
  async create(@Body(new ZodValidationPipe(jobCategoryUpsertSchema)) dto: z.infer<typeof jobCategoryUpsertSchema>) {
    return ok(await this.categories.create(dto));
  }

  @Patch(':id')
  @Permissions('jobs:write')
  @Audit('job-category.update', 'JobCategory')
  @ApiZodBody(jobCategoryUpsertSchema.partial())
  @ApiOperation({ summary: 'Update a department' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(jobCategoryUpsertSchema.partial())) dto: Partial<z.infer<typeof jobCategoryUpsertSchema>>,
  ) {
    return ok(await this.categories.update(id, dto));
  }

  @Delete(':id')
  @Permissions('jobs:write')
  @Audit('job-category.delete', 'JobCategory')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a department' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.categories.remove(id);
  }
}
