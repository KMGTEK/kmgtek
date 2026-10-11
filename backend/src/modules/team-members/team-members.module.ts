import { Module } from '@nestjs/common';
import { AdminTeamMembersController } from './admin-team-members.controller';
import { TeamMembersController } from './team-members.controller';
import { TeamMembersService } from './team-members.service';

@Module({
  controllers: [TeamMembersController, AdminTeamMembersController],
  providers: [TeamMembersService],
  exports: [TeamMembersService],
})
export class TeamMembersModule {}
