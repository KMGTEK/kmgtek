import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { emailTemplateUpdateSchema, type EmailTemplateUpdateInput } from '@kmg/shared';
import { z } from 'zod';
import { Audit, Permissions } from '../../common/decorators';
import { ApiDataResponse, ApiZodBody } from '../../common/decorators/swagger.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ok } from '../../common/utils/response.util';
import { EmailTemplatesService } from './email-templates.service';

const testSchema = z.object({ to: z.email() });

@ApiTags('Admin · Email templates')
@ApiBearerAuth()
@Controller('admin/email-templates')
export class EmailTemplatesController {
  constructor(private readonly templates: EmailTemplatesService) {}

  @Get()
  @Permissions('settings:read')
  @ApiOperation({ summary: 'List email templates' })
  @ApiDataResponse({ type: 'array', items: { type: 'object' } })
  async list() {
    return ok(await this.templates.list());
  }

  @Get(':id')
  @Permissions('settings:read')
  @ApiOperation({ summary: 'Get one email template' })
  @ApiDataResponse({ type: 'object' })
  async get(@Param('id') id: string) {
    return ok(await this.templates.get(id));
  }

  @Put(':id')
  @Permissions('settings:write')
  @Audit('email_template.update', 'EmailTemplate')
  @ApiZodBody(emailTemplateUpdateSchema)
  @ApiOperation({ summary: 'Update the subject/body of a template' })
  @ApiDataResponse({ type: 'object' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(emailTemplateUpdateSchema)) body: EmailTemplateUpdateInput,
  ) {
    return ok(await this.templates.update(id, body));
  }

  @Post(':id/test')
  @Permissions('settings:write')
  @Audit('email_template.test', 'EmailTemplate')
  @ApiZodBody(testSchema)
  @ApiOperation({ summary: 'Send a rendered test email' })
  @ApiDataResponse({ type: 'object', properties: { sent: { type: 'boolean' } } })
  async test(@Param('id') id: string, @Body(new ZodValidationPipe(testSchema)) body: { to: string }) {
    return ok({ sent: await this.templates.sendTest(id, body.to) });
  }
}
