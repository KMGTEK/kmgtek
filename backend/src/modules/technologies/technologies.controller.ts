import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { ApiDataResponse } from '../../common/decorators/swagger.decorators';
import { ok } from '../../common/utils/response.util';
import { TechnologiesService } from './technologies.service';

@ApiTags('Technologies')
@Controller('technologies')
export class TechnologiesController {
  constructor(private readonly technologies: TechnologiesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List technology categories with nested technologies' })
  @ApiDataResponse({ type: 'array', items: { type: 'object' } })
  async list() {
    return ok(await this.technologies.listPublic());
  }
}
