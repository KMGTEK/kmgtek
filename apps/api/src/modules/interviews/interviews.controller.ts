import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { interviewFeedbackSchema, interviewUpsertSchema } from '@kmg/shared';
import { Audit, CurrentUser, Permissions } from '../../common/decorators';
import { ApiDataResponse, ApiPaginatedResponse, ApiZodBody } from '../../common/decorators/swagger.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ok } from '../../common/utils/response.util';
import { InterviewsService, type InterviewFeedbackData, type InterviewListQuery, type InterviewUpdateData, type InterviewUpsertData } from './interviews.service';

@ApiTags('Admin · Interviews')
@ApiBearerAuth()
@Controller('admin/interviews')
export class InterviewsController {
  constructor(private readonly interviews: InterviewsService) {}

  @Get()
  @Permissions('interviews:read')
  @ApiOperation({ summary: 'List interviews' })
  @ApiPaginatedResponse()
  list(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('interviewerId') interviewerId?: string,
    @Query('applicationId') applicationId?: string,
    @Query('mine') mine?: string,
  ) {
    const query: InterviewListQuery = {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      from,
      to,
      status,
      interviewerId,
      applicationId,
      mine: mine === 'true',
      currentUserId: userId,
    };
    return this.interviews.list(query);
  }

  @Post()
  @Permissions('interviews:write')
  @Audit('interview.create', 'Interview')
  @ApiZodBody(interviewUpsertSchema)
  @ApiOperation({ summary: 'Schedule an interview' })
  async create(@Body(new ZodValidationPipe(interviewUpsertSchema)) dto: InterviewUpsertData, @CurrentUser('id') userId: string) {
    return ok(await this.interviews.create(dto, userId));
  }

  @Get(':id')
  @Permissions('interviews:read')
  @ApiOperation({ summary: 'Get an interview' })
  @ApiDataResponse({ type: 'object' })
  async get(@Param('id') id: string) {
    return ok(await this.interviews.get(id));
  }

  @Patch(':id')
  @Permissions('interviews:write')
  @Audit('interview.update', 'Interview')
  @ApiZodBody(interviewUpsertSchema.partial())
  @ApiOperation({ summary: 'Update / reschedule an interview' })
  async update(@Param('id') id: string, @Body(new ZodValidationPipe(interviewUpsertSchema.partial())) dto: InterviewUpdateData) {
    return ok(await this.interviews.update(id, dto));
  }

  @Delete(':id')
  @Permissions('interviews:write')
  @Audit('interview.delete', 'Interview')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel/delete an interview' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.interviews.remove(id);
  }

  @Post(':id/feedback')
  @Permissions('interviews:feedback')
  @Audit('interview.feedback', 'Interview')
  @ApiZodBody(interviewFeedbackSchema)
  @ApiOperation({ summary: 'Submit (or update) my feedback for an interview' })
  async feedback(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(interviewFeedbackSchema)) dto: InterviewFeedbackData,
  ) {
    return ok(await this.interviews.submitFeedback(id, userId, dto));
  }
}
