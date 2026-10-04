import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { leadUpdateSchema, LEAD_STATUSES, noteSchema, type LeadUpdateInput } from '@kmg/shared';
import type { Response } from 'express';
import { z } from 'zod';
import { Audit, CurrentUser, Permissions } from '../../common/decorators';
import { ApiDataResponse, ApiPaginatedResponse, ApiZodBody, ApiZodQuery } from '../../common/decorators/swagger.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ok } from '../../common/utils/response.util';
import type { RequestUser } from '../../common/types';
import { AdminLeadsService } from './admin-leads.service';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(LEAD_STATUSES).optional(),
  assignedToId: z.string().min(1).optional(),
  serviceId: z.string().min(1).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
type ListQuery = z.infer<typeof listQuerySchema>;

@ApiTags('Admin · Leads')
@ApiBearerAuth()
@Controller('admin/leads')
export class AdminLeadsController {
  constructor(private readonly leads: AdminLeadsService) {}

  @Get()
  @Permissions('leads:read')
  @ApiZodQuery(listQuerySchema)
  @ApiOperation({ summary: 'List leads' })
  @ApiPaginatedResponse()
  async list(@Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery) {
    return this.leads.list(query);
  }

  @Get('export')
  @Permissions('leads:read')
  @ApiZodQuery(listQuerySchema)
  @ApiOperation({ summary: 'Export leads as CSV' })
  async export(@Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery, @Res() res: Response) {
    const csv = await this.leads.exportCsv(query);
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    res.type('text/csv').send(csv);
  }

  @Get(':id')
  @Permissions('leads:read')
  @ApiOperation({ summary: 'Get one lead (marks it read)' })
  @ApiDataResponse({ type: 'object' })
  async get(@Param('id') id: string) {
    return ok(await this.leads.get(id));
  }

  @Patch(':id')
  @Permissions('leads:read')
  @Audit('lead.update', 'ContactLead')
  @ApiZodBody(leadUpdateSchema)
  @ApiOperation({ summary: 'Update lead status/assignee (status needs leads:write, assignee needs leads:assign)' })
  @ApiDataResponse({ type: 'object' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(leadUpdateSchema)) dto: LeadUpdateInput,
    @CurrentUser() user: RequestUser,
  ) {
    return ok(await this.leads.update(id, dto, user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('leads:write')
  @Audit('lead.delete', 'ContactLead')
  @ApiOperation({ summary: 'Delete a lead' })
  async remove(@Param('id') id: string) {
    await this.leads.delete(id);
  }

  @Post(':id/notes')
  @Permissions('leads:write')
  @Audit('lead.note_add', 'ContactLead')
  @ApiZodBody(noteSchema)
  @ApiOperation({ summary: 'Add a note to a lead' })
  @ApiDataResponse({ type: 'object' })
  async addNote(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(noteSchema)) body: { content: string },
    @CurrentUser('id') userId: string,
  ) {
    return ok(await this.leads.addNote(id, userId, body.content));
  }
}
