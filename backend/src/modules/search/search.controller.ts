import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { coercedNumber } from '@kmg/shared';
import { Public } from '../../common/decorators';
import { ApiDataResponse, ApiZodQuery } from '../../common/decorators/swagger.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ok } from '../../common/utils/response.util';
import { SearchService } from './search.service';

const querySchema = z.object({
  q: z.string().trim().min(2, 'Enter at least 2 characters'),
  limit: coercedNumber(z.number().int().min(1).max(20)).default(5),
});
type Query_ = z.infer<typeof querySchema>;

@ApiTags('Search')
@Controller('search')
export class SearchController {
  // Named distinctly from the `search` method below — same name for both would be a duplicate
  // class member identifier.
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get()
  @ApiZodQuery(querySchema)
  @ApiOperation({ summary: 'Cross-entity search (jobs, posts, services, technologies)' })
  @ApiDataResponse({ type: 'object' })
  async search(@Query(new ZodValidationPipe(querySchema)) query: Query_) {
    return ok(await this.searchService.search(query.q, query.limit));
  }
}
