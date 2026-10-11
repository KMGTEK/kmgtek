import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UPLOAD_PURPOSES, type UploadPurpose } from '@kmg/shared';
import type { Request, Response } from 'express';
import { Audit, CurrentUser, OptionalAuth, Permissions, Public } from '../../common/decorators';
import { ApiDataResponse } from '../../common/decorators/swagger.decorators';
import type { RequestUser } from '../../common/types';
import { ok } from '../../common/utils/response.util';
import { AppConfigService } from '../../config/config.module';
import { LocalStorageDriver } from '../../infrastructure/storage/local-storage.driver';
import { UploadsService } from './uploads.service';

/** Largest rule in UPLOAD_RULES — per-purpose limits are enforced after parsing. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

@ApiTags('Uploads')
@Controller()
export class UploadsController {
  constructor(
    private readonly uploads: UploadsService,
    private readonly config: AppConfigService,
    private readonly local: LocalStorageDriver,
  ) {}

  @Post('admin/uploads')
  @ApiBearerAuth()
  @Permissions('uploads:write')
  @Audit('upload.create', 'FileObject')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'purpose'],
      properties: {
        file: { type: 'string', format: 'binary' },
        purpose: { type: 'string', enum: [...UPLOAD_PURPOSES] },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a file (size + MIME + magic-byte validated)' })
  @ApiDataResponse({ type: 'object' })
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('purpose') purposeQuery: string | undefined,
    @Req() request: Request,
    @CurrentUser('id') userId: string,
  ) {
    const purpose = ((request.body as { purpose?: string })?.purpose ?? purposeQuery ?? 'GENERAL')
      .toString()
      .toUpperCase() as UploadPurpose;
    if (!(UPLOAD_PURPOSES as readonly string[]).includes(purpose)) {
      throw new BadRequestException(`purpose must be one of: ${UPLOAD_PURPOSES.join(', ')}`);
    }
    if (!file) throw new BadRequestException('No file uploaded (field name must be "file")');

    return ok(await this.uploads.store(file, purpose, userId));
  }

  /**
   * Serves local-disk objects. The signature is produced by `LocalStorageDriver`
   * (HMAC over key + visibility + expiry), so no session is needed here.
   */
  @Public()
  @Get('files/raw')
  @ApiOperation({ summary: 'Serve a signed local file (local storage driver only)' })
  async raw(
    @Query('key') key: string,
    @Query('v') visibility: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Query('dl') downloadName: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    if (this.config.storage.driver !== 'local') throw new NotFoundException('Not found');
    const parsed = {
      key,
      visibility: visibility === 'PRIVATE' ? ('PRIVATE' as const) : ('PUBLIC' as const),
      expiresAt: Number(exp),
      signature: sig ?? '',
      downloadName,
    };
    if (!key || !Number.isFinite(parsed.expiresAt) || !this.local.verify(parsed)) {
      throw new NotFoundException('File not found or link expired');
    }

    const record = await this.uploads.findByKey(key);
    const buffer = await this.local.get(key, parsed.visibility);

    response.setHeader('Content-Type', record?.mimeType ?? 'application/octet-stream');
    response.setHeader(
      'Cache-Control',
      parsed.visibility === 'PUBLIC' ? 'public, max-age=86400' : 'private, no-store',
    );
    if (downloadName) {
      response.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(downloadName)}"`,
      );
    }
    response.send(buffer);
  }

  @OptionalAuth()
  @Get('files/:id')
  @ApiOperation({ summary: 'Redirect to a file URL (private files require access)' })
  async redirect(
    @Param('id') id: string,
    @Query('download') download: string | undefined,
    @CurrentUser() user: RequestUser | undefined,
    @Res() response: Response,
  ): Promise<void> {
    const url = await this.uploads.resolveUrl(id, user, { download: download === '1' });
    response.redirect(302, url);
  }
}
