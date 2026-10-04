import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CONTENT_BLOCK_KEYS } from '@kmg/shared';
import { Audit, CurrentUser, Permissions, Public } from '../../common/decorators';
import { ApiDataResponse } from '../../common/decorators/swagger.decorators';
import { ok } from '../../common/utils/response.util';
import { ContentBlocksService } from './content-blocks.service';

@ApiTags('Content blocks')
@Controller()
export class ContentBlocksController {
  constructor(private readonly contentBlocks: ContentBlocksService) {}

  @Public()
  @Get('content-blocks')
  @ApiOperation({ summary: 'All content blocks, default-merged (public, no auth)' })
  @ApiDataResponse({ type: 'object' })
  async listPublic() {
    return ok(await this.contentBlocks.getAll());
  }

  @Public()
  @Get('content-blocks/:key')
  @ApiParam({ name: 'key', enum: CONTENT_BLOCK_KEYS })
  @ApiOperation({ summary: 'One content block, default-merged (public, no auth)' })
  @ApiDataResponse({ type: 'object' })
  async getPublic(@Param('key') key: string) {
    return ok(await this.contentBlocks.getOne(key));
  }

  @Get('admin/content-blocks')
  @ApiBearerAuth()
  @Permissions('content:read')
  @ApiOperation({ summary: 'All content blocks with label/group metadata, for the admin content list' })
  @ApiDataResponse({ type: 'array', items: { type: 'object' } })
  async adminList() {
    return ok(await this.contentBlocks.adminList());
  }

  @Get('admin/content-blocks/:key')
  @ApiBearerAuth()
  @Permissions('content:read')
  @ApiParam({ name: 'key', enum: CONTENT_BLOCK_KEYS })
  @ApiOperation({ summary: 'One content block with label/group metadata' })
  @ApiDataResponse({ type: 'object' })
  async adminGet(@Param('key') key: string) {
    return ok(await this.contentBlocks.adminGet(key));
  }

  @Put('admin/content-blocks/:key')
  @ApiBearerAuth()
  @Permissions('content:write')
  @Audit('content_block.update', 'ContentBlock', 'key')
  @ApiParam({ name: 'key', enum: CONTENT_BLOCK_KEYS })
  @ApiBody({ schema: { type: 'object' } })
  @ApiOperation({
    summary: 'Replace one content block',
    description:
      "Body shape depends on :key — validated against that key's schema in `CONTENT_BLOCK_SCHEMAS` (@kmg/shared). " +
      '404 for an unknown key, 400 with field-level `details` when the body fails validation.',
  })
  @ApiDataResponse({ type: 'object' })
  async update(@Param('key') key: string, @Body() body: unknown, @CurrentUser('id') userId: string) {
    return ok(await this.contentBlocks.update(key, body, userId));
  }

  @Post('admin/content-blocks/:key/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @Permissions('content:write')
  @Audit('content_block.reset', 'ContentBlock', 'key')
  @ApiParam({ name: 'key', enum: CONTENT_BLOCK_KEYS })
  @ApiOperation({ summary: "Delete a content block's override, reverting it to the default" })
  async reset(@Param('key') key: string) {
    await this.contentBlocks.reset(key);
  }
}
