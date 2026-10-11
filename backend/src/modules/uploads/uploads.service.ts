import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { FileObject } from '@prisma/client';
import { UPLOAD_RULES, type FileRef, type UploadPurpose } from '@kmg/shared';
import { AppConfigService } from '../../config/config.module';
import type { RequestUser } from '../../common/types';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { UPLOAD_FOLDERS, validateUpload, type UploadedFileLike } from './file-validation';

export interface UploadResult extends FileRef {
  key: string;
}

@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Validate + store a file and register it in the `files` table.
   *
   * ```ts
   * const file = await this.uploads.store(file, 'RESUME', user.id);
   * ```
   */
  async store(
    file: UploadedFileLike,
    purpose: UploadPurpose,
    uploadedById?: string | null,
  ): Promise<UploadResult> {
    validateUpload(file, purpose);
    const visibility = UPLOAD_RULES[purpose].private ? 'PRIVATE' : 'PUBLIC';

    const stored = await this.storage.put({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      visibility,
      folder: UPLOAD_FOLDERS[purpose],
    });

    const record = await this.prisma.fileObject.create({
      data: {
        key: stored.key,
        bucket: stored.bucket,
        originalName: file.originalname.slice(0, 255),
        mimeType: file.mimetype,
        size: stored.size,
        checksum: stored.checksum,
        purpose,
        visibility,
        uploadedById: uploadedById ?? null,
      },
    });

    return { ...this.toFileRef(record), key: record.key };
  }

  /** `FileRef` as returned by the API: public URL, or the `/files/:id` proxy. */
  toFileRef(file: FileObject): FileRef {
    return {
      id: file.id,
      url:
        file.visibility === 'PUBLIC'
          ? this.storage.publicUrl(file.key)
          : `${this.config.apiUrl}/api/v1/files/${file.id}`,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
    };
  }

  async findByKey(key: string): Promise<FileObject | null> {
    return this.prisma.fileObject.findFirst({ where: { key, deletedAt: null } });
  }

  async findById(id: string): Promise<FileObject> {
    const file = await this.prisma.fileObject.findFirst({ where: { id, deletedAt: null } });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  /**
   * Resolve the URL `GET /files/:id` redirects to. Private files require either the
   * `applications:read` permission or ownership (own resume / own application).
   */
  async resolveUrl(
    id: string,
    user?: RequestUser,
    options: { download?: boolean } = {},
  ): Promise<string> {
    const file = await this.findById(id);

    if (file.visibility === 'PRIVATE') {
      if (!user) throw new NotFoundException('File not found');
      if (!(await this.canAccessPrivate(file, user))) {
        throw new ForbiddenException('You do not have access to this file');
      }
    }

    return this.storage.signedUrl(file.key, file.visibility, {
      mimeType: file.mimeType,
      ...(options.download ? { downloadName: file.originalName } : {}),
    });
  }

  private async canAccessPrivate(file: FileObject, user: RequestUser): Promise<boolean> {
    if (user.permissions.includes('applications:read')) return true;
    if (file.uploadedById && file.uploadedById === user.id) return true;
    if (!user.candidateId) return false;

    const [resume, application] = await Promise.all([
      this.prisma.resume.count({ where: { fileId: file.id, candidateId: user.candidateId } }),
      this.prisma.jobApplication.count({
        where: {
          candidateId: user.candidateId,
          OR: [{ resumeFileId: file.id }, { coverFileId: file.id }],
        },
      }),
    ]);
    return resume > 0 || application > 0;
  }

  /** Soft-delete the DB row and remove the object from storage. */
  async remove(id: string): Promise<void> {
    const file = await this.findById(id);
    await this.prisma.fileObject.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.storage.delete(file.key, file.visibility).catch(() => undefined);
  }
}
