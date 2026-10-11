import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Public } from '../../common/decorators';
import { ApiDataResponse, ApiZodQuery } from '../../common/decorators/swagger.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { optionalBooleanQuery } from '../../common/utils/query.util';
import { ok } from '../../common/utils/response.util';
import { TeamMembersService } from './team-members.service';

const querySchema = z.object({ leadership: optionalBooleanQuery });
type Query_ = z.infer<typeof querySchema>;

@ApiTags('Team members')
@Controller('team-members')
export class TeamMembersController {
  constructor(private readonly teamMembers: TeamMembersService) {}

  @Public()
  @Get()
  @ApiZodQuery(querySchema)
  @ApiOperation({ summary: 'List published team members' })
  @ApiDataResponse({ type: 'array', items: { type: 'object' } })
  async list(@Query(new ZodValidationPipe(querySchema)) query: Query_) {
    return ok(await this.teamMembers.listPublic(query.leadership));
  }
}
