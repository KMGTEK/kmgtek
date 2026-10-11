import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { ApiDataResponse } from '../../common/decorators/swagger.decorators';
import { ok } from '../../common/utils/response.util';
import { ServicesService } from './services.service';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published services, ordered' })
  @ApiDataResponse({ type: 'array', items: { type: 'object' } })
  async list() {
    return ok(await this.services.listPublic());
  }

  @Public()
  @Get(':slug')
  @ApiParam({ name: 'slug' })
  @ApiOperation({ summary: 'Get a published service by slug' })
  @ApiDataResponse({ type: 'object' })
  async getBySlug(@Param('slug') slug: string) {
    return ok(await this.services.getPublicBySlug(slug));
  }
}
