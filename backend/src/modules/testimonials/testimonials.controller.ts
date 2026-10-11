import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Public } from '../../common/decorators';
import { ApiDataResponse, ApiZodQuery } from '../../common/decorators/swagger.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { optionalBooleanQuery } from '../../common/utils/query.util';
import { ok } from '../../common/utils/response.util';
import { TestimonialsService } from './testimonials.service';

const querySchema = z.object({ featured: optionalBooleanQuery });
type Query_ = z.infer<typeof querySchema>;

@ApiTags('Testimonials')
@Controller('testimonials')
export class TestimonialsController {
  constructor(private readonly testimonials: TestimonialsService) {}

  @Public()
  @Get()
  @ApiZodQuery(querySchema)
  @ApiOperation({ summary: 'List published testimonials' })
  @ApiDataResponse({ type: 'array', items: { type: 'object' } })
  async list(@Query(new ZodValidationPipe(querySchema)) query: Query_) {
    return ok(await this.testimonials.listPublic(query.featured));
  }
}
