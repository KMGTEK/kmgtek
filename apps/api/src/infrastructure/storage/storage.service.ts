import type { FileVisibility } from '@prisma/client';

export interface PutObjectParams {
  /** Raw bytes to store. */
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  visibility: FileVisibility;
  /** Logical folder, e.g. `resumes` — the driver appends a random file name. */
  folder?: string;
}

export interface StoredObject {
  key: string;
  bucket: string;
  size: number;
  /** sha256 of the stored bytes. */
  checksum: string;
}

export interface SignedUrlOptions {
  expiresInSeconds?: number;
  /** Force a download with this file name instead of inline rendering. */
  downloadName?: string;
  mimeType?: string;
}

/**
 * Object storage abstraction. Inject `StorageService` — the concrete driver
 * (local disk or S3/MinIO) is selected by `STORAGE_DRIVER`.
 *
 * ```ts
 * const object = await this.storage.put({ buffer, originalName, mimeType, visibility: 'PRIVATE', folder: 'resumes' });
 * const url = await this.storage.signedUrl(object.key, 'PRIVATE', { downloadName: 'cv.pdf' });
 * ```
 */
export abstract class StorageService {
  abstract put(params: PutObjectParams): Promise<StoredObject>;

  abstract get(key: string, visibility: FileVisibility): Promise<Buffer>;

  abstract delete(key: string, visibility: FileVisibility): Promise<void>;

  /** Time-limited URL for a private object (or a stable URL for a public one). */
  abstract signedUrl(
    key: string,
    visibility: FileVisibility,
    options?: SignedUrlOptions,
  ): Promise<string>;

  /** Stable, publicly reachable URL. Only valid for `PUBLIC` objects. */
  abstract publicUrl(key: string): string;

  /** `resumes/2026/01/ab12cd34.pdf` */
  protected buildKey(folder: string | undefined, originalName: string, random: string): string {
    const now = new Date();
    const ext = (originalName.match(/\.[a-z0-9]{1,8}$/i)?.[0] ?? '').toLowerCase();
    const prefix = folder ? `${folder.replace(/^\/+|\/+$/g, '')}/` : '';
    return `${prefix}${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${random}${ext}`;
  }
}
