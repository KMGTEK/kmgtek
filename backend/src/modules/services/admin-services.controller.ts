import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { serviceUpsertSchema } from '@kmg/shared';
import { z } from 'zod';
import { Audit, Permissions } from '../../common/decorators';
import { ApiDataResponse, ApiZodBody } from '../../common/decorators/swagger.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ok } from '../../common/utils/response.util';
import { ServicesService, type ServiceUpsertData } from './services.service';

const reorderSchema = z.object({ ids: z.array(z.string().min(1)).min(1) });
type ReorderInput = z.infer<typeof reorderSchema>;

@ApiTags('Admin · Services')
@ApiBearerAuth()
@Controller('admin/services')
export class AdminServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  @Permissions('content:read')
  @ApiOperation({ summary: 'List all services (including unpublished)' })
  @ApiDataResponse({ type: 'array', items: { type: 'object' } })
  async list() {
    return ok(await this.services.listAdmin());
  }

  @Post()
  @Permissions('content:write')
  @Audit('service.create', 'Service')
  @ApiZodBody(serviceUpsertSchema)
  @ApiOperation({ summary: 'Create a service' })
  @ApiDataResponse({ type: 'object' })
  async create(@Body(new ZodValidationPipe(serviceUpsertSchema)) dto: ServiceUpsertData) {
    return ok(await this.services.create(dto));
  }

  @Patch('reorder')
  @Permissions('content:write')
  @Audit('service.reorder', 'Service')
  @ApiZodBody(reorderSchema)
  @ApiOperation({ summary: 'Persist a new display order' })
  @ApiDataResponse({ type: 'object' })
  async reorder(@Body(new ZodValidationPipe(reorderSchema)) body: ReorderInput) {
    await this.services.reorder(body.ids);
    return ok({ success: true });
  }

  @Get(':id')
  @Permissions('content:read')
  @ApiOperation({ summary: 'Get one service by id' })
  @ApiDataResponse({ type: 'object' })
  async get(@Param('id') id: string) {
    return ok(await this.services.getAdmin(id));
  }

  @Patch(':id')
  @Permissions('content:write')
  @Audit('service.update', 'Service')
  @ApiZodBody(serviceUpsertSchema)
  @ApiOperation({ summary: 'Update a service' })
  @ApiDataResponse({ type: 'object' })
  async update(@Param('id') id: string, @Body(new ZodValidationPipe(serviceUpsertSchema)) dto: ServiceUpsertData) {
    return ok(await this.services.update(id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('content:write')
  @Audit('service.delete', 'Service')
  @ApiOperation({ summary: 'Delete a service' })
  async remove(@Param('id') id: string) {
    await this.services.delete(id);
  }
}
