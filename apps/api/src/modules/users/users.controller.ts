import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { staffUserUpsertSchema, type Permission, type StaffUserUpsertInput } from '@kmg/shared';
import { Audit, Permissions } from '../../common/decorators';
import {
  ApiDataResponse,
  ApiPaginatedResponse,
  ApiZodBody,
} from '../../common/decorators/swagger.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ok } from '../../common/utils/response.util';
import { UsersService, type StaffListQuery } from './users.service';

const upsertPipe = new ZodValidationPipe(staffUserUpsertSchema);
const partialPipe = new ZodValidationPipe(staffUserUpsertSchema.partial());

@ApiTags('Admin · Users')
@ApiBearerAuth()
@Controller('admin/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Permissions('users:read')
  @ApiOperation({ summary: 'List staff users' })
  @ApiPaginatedResponse()
  list(@Query() query: StaffListQuery) {
    return this.users.list(query);
  }

  @Get('assignable')
  @Permissions('users:read')
  @ApiQuery({ name: 'permission', required: false, description: 'e.g. interviews:feedback' })
  @ApiOperation({ summary: 'Staff members that can be assigned work' })
  @ApiDataResponse({ type: 'array', items: { type: 'object' } })
  async assignable(@Query('permission') permission?: Permission) {
    return ok(await this.users.assignable(permission));
  }

  @Get(':id')
  @Permissions('users:read')
  @ApiOperation({ summary: 'Get one staff user' })
  @ApiDataResponse({ type: 'object' })
  async get(@Param('id') id: string) {
    return ok(await this.users.get(id));
  }

  @Post()
  @Permissions('users:write')
  @Audit('user.create', 'User')
  @ApiZodBody(staffUserUpsertSchema)
  @ApiOperation({ summary: 'Create a staff user' })
  @ApiDataResponse({ type: 'object' })
  async create(@Body(upsertPipe) body: StaffUserUpsertInput) {
    return ok(await this.users.create(body as Parameters<UsersService['create']>[0]));
  }

  @Patch(':id')
  @Permissions('users:write')
  @Audit('user.update', 'User')
  @ApiZodBody(staffUserUpsertSchema.partial())
  @ApiOperation({ summary: 'Update a staff user' })
  @ApiDataResponse({ type: 'object' })
  async update(@Param('id') id: string, @Body(partialPipe) body: Partial<StaffUserUpsertInput>) {
    return ok(await this.users.update(id, body as Parameters<UsersService['update']>[1]));
  }

  @Delete(':id')
  @Permissions('users:write')
  @Audit('user.delete', 'User')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a staff user' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.users.remove(id);
  }
}
