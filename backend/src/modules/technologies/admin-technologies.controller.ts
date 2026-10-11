import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { technologyUpsertSchema } from '@kmg/shared';
import { z } from 'zod';
import { Audit, Permissions } from '../../common/decorators';
import { ApiDataResponse, ApiZodBody } from '../../common/decorators/swagger.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ok } from '../../common/utils/response.util';
import { technologyCategoryUpsertSchema, type TechnologyCategoryUpsertData } from './technology-category.schema';
import { TechnologiesService, type TechnologyUpsertData } from './technologies.service';

const reorderSchema = z.object({ ids: z.array(z.string().min(1)).min(1) });
type ReorderInput = z.infer<typeof reorderSchema>;

@ApiTags('Admin · Technology categories')
@ApiBearerAuth()
@Controller('admin/technology-categories')
export class AdminTechnologyCategoriesController {
  constructor(private readonly technologies: TechnologiesService) {}

  @Get()
  @Permissions('content:read')
  @ApiOperation({ summary: 'List technology categories' })
  @ApiDataResponse({ type: 'array', items: { type: 'object' } })
  async list() {
    return ok(await this.technologies.listCategories());
  }

  @Post()
  @Permissions('content:write')
  @Audit('technology_category.create', 'TechnologyCategory')
  @ApiZodBody(technologyCategoryUpsertSchema)
  @ApiOperation({ summary: 'Create a technology category' })
  @ApiDataResponse({ type: 'object' })
  async create(@Body(new ZodValidationPipe(technologyCategoryUpsertSchema)) dto: TechnologyCategoryUpsertData) {
    return ok(await this.technologies.createCategory(dto));
  }

  @Patch(':id')
  @Permissions('content:write')
  @Audit('technology_category.update', 'TechnologyCategory')
  @ApiZodBody(technologyCategoryUpsertSchema)
  @ApiOperation({ summary: 'Update a technology category' })
  @ApiDataResponse({ type: 'object' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(technologyCategoryUpsertSchema)) dto: TechnologyCategoryUpsertData,
  ) {
    return ok(await this.technologies.updateCategory(id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('content:write')
  @Audit('technology_category.delete', 'TechnologyCategory')
  @ApiOperation({ summary: 'Delete a technology category' })
  async remove(@Param('id') id: string) {
    await this.technologies.deleteCategory(id);
  }
}

@ApiTags('Admin · Technologies')
@ApiBearerAuth()
@Controller('admin/technologies')
export class AdminTechnologiesController {
  constructor(private readonly technologies: TechnologiesService) {}

  @Get()
  @Permissions('content:read')
  @ApiOperation({ summary: 'List technologies' })
  @ApiDataResponse({ type: 'array', items: { type: 'object' } })
  async list() {
    return ok(await this.technologies.listTechnologies());
  }

  @Get(':id')
  @Permissions('content:read')
  @ApiOperation({ summary: 'Get one technology' })
  @ApiDataResponse({ type: 'object' })
  async get(@Param('id') id: string) {
    return ok(await this.technologies.getTechnology(id));
  }

  @Post()
  @Permissions('content:write')
  @Audit('technology.create', 'Technology')
  @ApiZodBody(technologyUpsertSchema)
  @ApiOperation({ summary: 'Create a technology' })
  @ApiDataResponse({ type: 'object' })
  async create(@Body(new ZodValidationPipe(technologyUpsertSchema)) dto: TechnologyUpsertData) {
    return ok(await this.technologies.createTechnology(dto));
  }

  @Patch('reorder')
  @Permissions('content:write')
  @Audit('technology.reorder', 'Technology')
  @ApiZodBody(reorderSchema)
  @ApiOperation({ summary: 'Persist a new display order' })
  @ApiDataResponse({ type: 'object' })
  async reorder(@Body(new ZodValidationPipe(reorderSchema)) body: ReorderInput) {
    await this.technologies.reorderTechnologies(body.ids);
    return ok({ success: true });
  }

  @Patch(':id')
  @Permissions('content:write')
  @Audit('technology.update', 'Technology')
  @ApiZodBody(technologyUpsertSchema)
  @ApiOperation({ summary: 'Update a technology' })
  @ApiDataResponse({ type: 'object' })
  async update(@Param('id') id: string, @Body(new ZodValidationPipe(technologyUpsertSchema)) dto: TechnologyUpsertData) {
    return ok(await this.technologies.updateTechnology(id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('content:write')
  @Audit('technology.delete', 'Technology')
  @ApiOperation({ summary: 'Delete a technology' })
  async remove(@Param('id') id: string) {
    await this.technologies.deleteTechnology(id);
  }
}
