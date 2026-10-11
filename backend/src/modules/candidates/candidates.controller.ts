import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { candidateProfileSchema, candidateSkillsSchema } from '@kmg/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { ApiDataResponse, ApiZodBody } from '../../common/decorators/swagger.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ok } from '../../common/utils/response.util';
import { CandidatesService, type CandidateProfileData, type CandidateSkillsData } from './candidates.service';

@ApiTags('Candidate portal')
@ApiBearerAuth()
@Roles('CANDIDATE')
@Controller('me')
export class CandidatesController {
  constructor(private readonly candidates: CandidatesService) {}

  private requireCandidateId(candidateId: string | null | undefined): string {
    if (!candidateId) throw new NotFoundException('Candidate profile not found');
    return candidateId;
  }

  @Get('profile')
  @ApiOperation({ summary: 'My candidate profile' })
  @ApiDataResponse({ type: 'object' })
  async getProfile(@CurrentUser('candidateId') candidateId: string | null) {
    return ok(await this.candidates.getProfile(this.requireCandidateId(candidateId)));
  }

  @Patch('profile')
  @ApiZodBody(candidateProfileSchema)
  @ApiOperation({ summary: 'Update my candidate profile' })
  async updateProfile(
    @CurrentUser('candidateId') candidateId: string | null,
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(candidateProfileSchema)) dto: CandidateProfileData,
  ) {
    return ok(await this.candidates.updateProfile(this.requireCandidateId(candidateId), userId, dto));
  }

  @Put('skills')
  @ApiZodBody(candidateSkillsSchema)
  @ApiOperation({ summary: 'Replace my skill list' })
  async updateSkills(
    @CurrentUser('candidateId') candidateId: string | null,
    @Body(new ZodValidationPipe(candidateSkillsSchema)) dto: CandidateSkillsData,
  ) {
    return ok(await this.candidates.updateSkills(this.requireCandidateId(candidateId), dto));
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Upload my avatar' })
  async setAvatar(@CurrentUser('id') userId: string, @UploadedFile() file: Express.Multer.File) {
    return ok(await this.candidates.setAvatar(userId, file));
  }

  @Get('resumes')
  @ApiOperation({ summary: 'List my resumes' })
  async listResumes(@CurrentUser('candidateId') candidateId: string | null) {
    return ok(await this.candidates.listResumes(this.requireCandidateId(candidateId)));
  }

  @Post('resumes')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Upload a resume' })
  async addResume(
    @CurrentUser('candidateId') candidateId: string | null,
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return ok(await this.candidates.addResume(this.requireCandidateId(candidateId), userId, file));
  }

  @Patch('resumes/:id/primary')
  @ApiOperation({ summary: 'Mark a resume as primary' })
  async setPrimaryResume(@CurrentUser('candidateId') candidateId: string | null, @Param('id') id: string) {
    return ok(await this.candidates.setPrimaryResume(this.requireCandidateId(candidateId), id));
  }

  @Delete('resumes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a resume' })
  async removeResume(@CurrentUser('candidateId') candidateId: string | null, @Param('id') id: string): Promise<void> {
    await this.candidates.removeResume(this.requireCandidateId(candidateId), id);
  }

  @Get('saved-jobs')
  @ApiOperation({ summary: 'List my saved jobs' })
  async listSavedJobs(@CurrentUser('candidateId') candidateId: string | null) {
    return ok(await this.candidates.listSavedJobs(this.requireCandidateId(candidateId)));
  }

  @Post('saved-jobs/:jobId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Save a job' })
  async saveJob(@CurrentUser('candidateId') candidateId: string | null, @Param('jobId') jobId: string): Promise<void> {
    await this.candidates.saveJob(this.requireCandidateId(candidateId), jobId);
  }

  @Delete('saved-jobs/:jobId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a saved job' })
  async unsaveJob(@CurrentUser('candidateId') candidateId: string | null, @Param('jobId') jobId: string): Promise<void> {
    await this.candidates.unsaveJob(this.requireCandidateId(candidateId), jobId);
  }
}
