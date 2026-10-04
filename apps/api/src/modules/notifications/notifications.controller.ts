import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { ApiDataResponse, ApiPaginatedResponse } from '../../common/decorators/swagger.decorators';
import { ok } from '../../common/utils/response.util';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List my notifications (meta.unread holds the unread count)' })
  @ApiPaginatedResponse()
  list(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('unread') unread?: string,
  ) {
    return this.notifications.list(userId, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      unread: unread === 'true',
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Number of unread notifications' })
  @ApiDataResponse({ type: 'object', properties: { count: { type: 'integer' } } })
  async unreadCount(@CurrentUser('id') userId: string) {
    return ok({ count: await this.notifications.unreadCount(userId) });
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark one notification as read' })
  async markRead(@CurrentUser('id') userId: string, @Param('id') id: string): Promise<void> {
    await this.notifications.markRead(userId, id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark every notification as read' })
  async markAllRead(@CurrentUser('id') userId: string): Promise<void> {
    await this.notifications.markAllRead(userId);
  }
}
