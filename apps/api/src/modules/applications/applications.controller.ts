import { Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators';
import { ApiDataResponse, ApiPaginatedResponse } from '../../common/decorators/swagger.decorators';
import { ok } from '../../common/utils/response.util';
import { ApplicationsService } from './applications.service';

@ApiTags('Candidate portal')
@ApiBearerAuth()
@Roles('CANDIDATE')
@Controller('me')
export class ApplicationsMeController {
  constructor(private readonly applications: ApplicationsService) {}

  private requireCandidateId(candidateId: string | null | undefined): string {
    if (!candidateId) throw new NotFoundException('Candidate profile not found');
    return candidateId;
  }

  @Get('applications')
  @ApiOperation({ summary: 'List my applications' })
  @ApiPaginatedResponse()
  list(
    @CurrentUser('candidateId') candidateId: string | null,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ) {
    return this.applications.listMine(this.requireCandidateId(candidateId), {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status,
    });
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'My candidate dashboard summary' })
  @ApiDataResponse({ type: 'object' })
  async dashboard(@CurrentUser('candidateId') candidateId: string | null) {
    return ok(await this.applications.dashboard(this.requireCandidateId(candidateId)));
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'Get one of my applications (with history + upcoming interviews)' })
  @ApiDataResponse({ type: 'object' })
  async get(@CurrentUser('candidateId') candidateId: string | null, @Param('id') id: string) {
    return ok(await this.applications.getMine(this.requireCandidateId(candidateId), id));
  }

  @Post('applications/:id/withdraw')
  @ApiOperation({ summary: 'Withdraw my application' })
  @ApiDataResponse({ type: 'object' })
  async withdraw(@CurrentUser('candidateId') candidateId: string | null, @Param('id') id: string) {
    return ok(await this.applications.withdraw(this.requireCandidateId(candidateId), id));
  }
}
