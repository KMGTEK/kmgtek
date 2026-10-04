import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { testimonialUpsertSchema } from '@kmg/shared';
import { z } from 'zod';
import { Audit, Permissions } from '../../common/decorators';
import { ApiDataResponse, ApiZodBody } from '../../common/decorators/swagger.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ok } from '../../common/utils/response.util';
import { TestimonialsService, type TestimonialUpsertData } from './testimonials.service';

const reorderSchema = z.object({ ids: z.array(z.string().min(1)).min(1) });
type ReorderInput = z.infer<typeof reorderSchema>;

@ApiTags('Admin · Testimonials')
@ApiBearerAuth()
@Controller('admin/testimonials')
export class AdminTestimonialsController {
  constructor(private readonly testimonials: TestimonialsService) {}

  @Get()
  @Permissions('content:read')
  @ApiOperation({ summary: 'List all testimonials' })
  @ApiDataResponse({ type: 'array', items: { type: 'object' } })
  async list() {
    return ok(await this.testimonials.listAdmin());
  }

  @Post()
  @Permissions('content:write')
  @Audit('testimonial.create', 'Testimonial')
  @ApiZodBody(testimonialUpsertSchema)
  @ApiOperation({ summary: 'Create a testimonial' })
  @ApiDataResponse({ type: 'object' })
  async create(@Body(new ZodValidationPipe(testimonialUpsertSchema)) dto: TestimonialUpsertData) {
    return ok(await this.testimonials.create(dto));
  }

  @Patch('reorder')
  @Permissions('content:write')
  @Audit('testimonial.reorder', 'Testimonial')
  @ApiZodBody(reorderSchema)
  @ApiOperation({ summary: 'Persist a new display order' })
  @ApiDataResponse({ type: 'object' })
  async reorder(@Body(new ZodValidationPipe(reorderSchema)) body: ReorderInput) {
    await this.testimonials.reorder(body.ids);
    return ok({ success: true });
  }

  @Get(':id')
  @Permissions('content:read')
  @ApiOperation({ summary: 'Get one testimonial' })
  @ApiDataResponse({ type: 'object' })
  async get(@Param('id') id: string) {
    return ok(await this.testimonials.get(id));
  }

  @Patch(':id')
  @Permissions('content:write')
  @Audit('testimonial.update', 'Testimonial')
  @ApiZodBody(testimonialUpsertSchema)
  @ApiOperation({ summary: 'Update a testimonial' })
  @ApiDataResponse({ type: 'object' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(testimonialUpsertSchema)) dto: TestimonialUpsertData,
  ) {
    return ok(await this.testimonials.update(id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('content:write')
  @Audit('testimonial.delete', 'Testimonial')
  @ApiOperation({ summary: 'Delete a testimonial' })
  async remove(@Param('id') id: string) {
    await this.testimonials.delete(id);
  }
}
