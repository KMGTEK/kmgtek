import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS, type Permission } from '@kmg/shared';
import { z } from 'zod';
import { Audit, Permissions } from '../../common/decorators';
import { ApiDataResponse, ApiZodBody } from '../../common/decorators/swagger.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ok } from '../../common/utils/response.util';
import { RbacService } from './rbac.service';

const rolePermissionsSchema = z.object({
  permissions: z.array(z.enum(PERMISSIONS)).max(PERMISSIONS.length),
});

@ApiTags('Admin · Roles')
@ApiBearerAuth()
@Controller('admin/roles')
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  @Get()
  @Permissions('users:read')
  @ApiOperation({ summary: 'List roles with their permissions and user counts' })
  @ApiDataResponse({ type: 'array', items: { type: 'object' } })
  async list() {
    return ok(await this.rbac.listRoles());
  }

  @Get('permissions')
  @Permissions('users:read')
  @ApiOperation({ summary: 'Every permission key known to the platform' })
  @ApiDataResponse({ type: 'array', items: { type: 'string' } })
  catalog() {
    return ok([...PERMISSIONS]);
  }

  @Put(':id/permissions')
  @Permissions('roles:write')
  @Audit('role.permissions_update', 'Role')
  @ApiZodBody(rolePermissionsSchema)
  @ApiOperation({ summary: 'Replace the permissions granted to a role' })
  @ApiDataResponse({ type: 'object' })
  async setPermissions(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rolePermissionsSchema)) body: { permissions: Permission[] },
  ) {
    return ok(await this.rbac.setRolePermissions(id, body.permissions));
  }
}
