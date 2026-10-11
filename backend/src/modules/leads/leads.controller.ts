import { Body, Controller, HttpCode, HttpStatus, Ip, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { contactSchema, type ContactInput } from '@kmg/shared';
import type { Request } from 'express';
import { Public, RateLimit } from '../../common/decorators';
import { ApiDataResponse, ApiZodBody } from '../../common/decorators/swagger.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ok } from '../../common/utils/response.util';
import { LeadsService } from './leads.service';

@ApiTags('Contact')
@Controller()
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Public()
  @RateLimit(5, 60)
  @Post('contact')
  @HttpCode(HttpStatus.CREATED)
  @ApiZodBody(contactSchema)
  @ApiOperation({ summary: 'Submit the contact form (rate limited 5/min/IP)' })
  @ApiDataResponse({ type: 'object', properties: { id: { type: 'string', nullable: true } } })
  async create(@Body(new ZodValidationPipe(contactSchema)) dto: ContactInput, @Ip() ip: string, @Req() req: Request) {
    const result = await this.leads.createFromContactForm(dto, { ip, userAgent: req.headers['user-agent'] });
    return ok(result);
  }
}
