import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { ApiDataResponse } from '../../common/decorators/swagger.decorators';
import { ok } from '../../common/utils/response.util';
import { SitemapService } from './sitemap.service';

@ApiTags('Sitemap')
@Controller('sitemap')
export class SitemapController {
  constructor(private readonly sitemap: SitemapService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Minimal published/updated fields for building the XML sitemap' })
  @ApiDataResponse({ type: 'object' })
  async get() {
    return ok(await this.sitemap.build());
  }
}
