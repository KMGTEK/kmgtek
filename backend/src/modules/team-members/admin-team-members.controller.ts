import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { teamMemberUpsertSchema } from '@kmg/shared';
import { z } from 'zod';
import { Audit, Permissions } from '../../common/decorators';
import { ApiDataResponse, ApiZodBody } from '../../common/decorators/swagger.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ok } from '../../common/utils/response.util';
import { TeamMembersService, type TeamMemberUpsertData } from './team-members.service';

const reorderSchema = z.object({ ids: z.array(z.string().min(1)).min(1) });
type ReorderInput = z.infer<typeof reorderSchema>;

@ApiTags('Admin · Team members')
@ApiBearerAuth()
@Controller('admin/team-members')
export class AdminTeamMembersController {
  constructor(private readonly teamMembers: TeamMembersService) {}

  @Get()
  @Permissions('content:read')
  @ApiOperation({ summary: 'List all team members' })
  @ApiDataResponse({ type: 'array', items: { type: 'object' } })
  async list() {
    return ok(await this.teamMembers.listAdmin());
  }

  @Post()
  @Permissions('content:write')
  @Audit('team_member.create', 'TeamMember')
  @ApiZodBody(teamMemberUpsertSchema)
  @ApiOperation({ summary: 'Create a team member' })
  @ApiDataResponse({ type: 'object' })
  async create(@Body(new ZodValidationPipe(teamMemberUpsertSchema)) dto: TeamMemberUpsertData) {
    return ok(await this.teamMembers.create(dto));
  }

  @Patch('reorder')
  @Permissions('content:write')
  @Audit('team_member.reorder', 'TeamMember')
  @ApiZodBody(reorderSchema)
  @ApiOperation({ summary: 'Persist a new display order' })
  @ApiDataResponse({ type: 'object' })
  async reorder(@Body(new ZodValidationPipe(reorderSchema)) body: ReorderInput) {
    await this.teamMembers.reorder(body.ids);
    return ok({ success: true });
  }

  @Get(':id')
  @Permissions('content:read')
  @ApiOperation({ summary: 'Get one team member' })
  @ApiDataResponse({ type: 'object' })
  async get(@Param('id') id: string) {
    return ok(await this.teamMembers.get(id));
  }

  @Patch(':id')
  @Permissions('content:write')
  @Audit('team_member.update', 'TeamMember')
  @ApiZodBody(teamMemberUpsertSchema)
  @ApiOperation({ summary: 'Update a team member' })
  @ApiDataResponse({ type: 'object' })
  async update(@Param('id') id: string, @Body(new ZodValidationPipe(teamMemberUpsertSchema)) dto: TeamMemberUpsertData) {
    return ok(await this.teamMembers.update(id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('content:write')
  @Audit('team_member.delete', 'TeamMember')
  @ApiOperation({ summary: 'Delete a team member' })
  async remove(@Param('id') id: string) {
    await this.teamMembers.delete(id);
  }
}
