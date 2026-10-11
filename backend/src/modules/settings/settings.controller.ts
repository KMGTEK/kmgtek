import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Audit, CurrentUser, Permissions, Public } from '../../common/decorators';
import { ApiDataResponse } from '../../common/decorators/swagger.decorators';
import { ok } from '../../common/utils/response.util';
import { SETTINGS_GROUPS } from './settings.defaults';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@Controller()
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Public()
  @Get('settings/public')
  @ApiOperation({ summary: 'Public website settings (no email group)' })
  @ApiDataResponse({ type: 'object' })
  async publicSettings() {
    return ok(await this.settings.getPublic());
  }

  @Get('admin/settings')
  @ApiBearerAuth()
  @Permissions('settings:read')
  @ApiOperation({ summary: 'All website settings, including the email group' })
  @ApiDataResponse({ type: 'object' })
  async all() {
    return ok(await this.settings.getAll());
  }

  @Put('admin/settings/:group')
  @ApiBearerAuth()
  @Permissions('settings:write')
  @Audit('settings.update', 'WebsiteSetting', 'group')
  @ApiParam({ name: 'group', enum: SETTINGS_GROUPS })
  @ApiOperation({ summary: 'Replace one settings group' })
  @ApiDataResponse({ type: 'object' })
  async update(
    @Param('group') group: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser('id') userId: string,
  ) {
    return ok(await this.settings.update(group, body, userId));
  }
}
