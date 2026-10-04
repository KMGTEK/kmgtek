import { Injectable, NotFoundException } from '@nestjs/common';
import type { FileVisibility } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, normalize, resolve } from 'node:path';
import { AppConfigService } from '../../config/config.module';
import { hmac, safeEqual } from '../../common/utils/crypto.util';
import {
  StorageService,
  type PutObjectParams,
  type SignedUrlOptions,
  type StoredObject,
} from './storage.service';

export interface LocalSignature {
  key: string;
  visibility: FileVisibility;
  expiresAt: number;
  signature: string;
  downloadName?: string;
}

/**
 * Disk-backed driver for local development (no MinIO/S3 needed).
 * Files live under `STORAGE_LOCAL_DIR/<public|private>/<key>` and are served
 * through `GET /api/v1/files/raw`, which verifies an HMAC signature.
 */
@Injectable()
export class LocalStorageDriver extends StorageService {
  private readonly root: string;
  private readonly secret: string;

  constructor(private readonly config: AppConfigService) {
    super();
    const dir = config.storage.localDir;
    this.root = isAbsolute(dir) ? dir : resolve(process.cwd(), dir);
    this.secret = `${config.jwt.accessSecret}:files`;
  }

  private bucketDir(visibility: FileVisibility): string {
    return join(this.root, visibility === 'PRIVATE' ? 'private' : 'public');
  }

  /** Resolve a key inside its bucket, refusing path traversal. */
  private pathFor(key: string, visibility: FileVisibility): string {
    const base = this.bucketDir(visibility);
    const target = resolve(base, normalize(key).replace(/^(\.\.[/\\])+/, ''));
    if (!target.startsWith(base)) throw new NotFoundException('File not found');
    return target;
  }

  async put(params: PutObjectParams): Promise<StoredObject> {
    const key = this.buildKey(params.folder, params.originalName, randomBytes(16).toString('hex'));
    const target = this.pathFor(key, params.visibility);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, params.buffer);
    return {
      key,
      bucket: params.visibility === 'PRIVATE' ? 'local-private' : 'local-public',
      size: params.buffer.byteLength,
      checksum: createHash('sha256').update(params.buffer).digest('hex'),
    };
  }

  async get(key: string, visibility: FileVisibility): Promise<Buffer> {
    try {
      return await readFile(this.pathFor(key, visibility));
    } catch {
      throw new NotFoundException('File not found');
    }
  }

  async delete(key: string, visibility: FileVisibility): Promise<void> {
    await rm(this.pathFor(key, visibility), { force: true });
  }

  async signedUrl(
    key: string,
    visibility: FileVisibility,
    options: SignedUrlOptions = {},
  ): Promise<string> {
    const ttl = options.expiresInSeconds ?? this.config.storage.signedUrlTtlSeconds;
    const expiresAt = Math.floor(Date.now() / 1000) + ttl;
    const url = new URL(`${this.config.apiUrl}/api/v1/files/raw`);
    url.searchParams.set('key', key);
    url.searchParams.set('v', visibility);
    url.searchParams.set('exp', String(expiresAt));
    if (options.downloadName) url.searchParams.set('dl', options.downloadName);
    url.searchParams.set('sig', this.sign(key, visibility, expiresAt, options.downloadName));
    return url.toString();
  }

  publicUrl(key: string): string {
    // Public objects get a long-lived (1 year) signature so URLs can be cached.
    const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;
    const url = new URL(`${this.config.apiUrl}/api/v1/files/raw`);
    url.searchParams.set('key', key);
    url.searchParams.set('v', 'PUBLIC');
    url.searchParams.set('exp', String(expiresAt));
    url.searchParams.set('sig', this.sign(key, 'PUBLIC', expiresAt));
    return url.toString();
  }

  sign(key: string, visibility: FileVisibility, expiresAt: number, downloadName?: string): string {
    return hmac(this.secret, `${key}|${visibility}|${expiresAt}|${downloadName ?? ''}`);
  }

  /** Used by `GET /files/raw` to validate an incoming signature. */
  verify(params: LocalSignature): boolean {
    if (params.expiresAt * 1000 < Date.now()) return false;
    const expected = this.sign(params.key, params.visibility, params.expiresAt, params.downloadName);
    return safeEqual(expected, params.signature);
  }
}
