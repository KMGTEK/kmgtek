import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { FileVisibility } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { AppConfigService } from '../../config/config.module';
import {
  StorageService,
  type PutObjectParams,
  type SignedUrlOptions,
  type StoredObject,
} from './storage.service';

/** S3 / MinIO driver (path-style addressing works out of the box with MinIO). */
@Injectable()
export class S3StorageDriver extends StorageService {
  private readonly client: S3Client;

  constructor(private readonly config: AppConfigService) {
    super();
    const s3 = config.storage.s3;
    this.client = new S3Client({
      region: s3.region,
      endpoint: s3.endpoint,
      forcePathStyle: s3.forcePathStyle,
      credentials:
        s3.accessKey && s3.secretKey
          ? { accessKeyId: s3.accessKey, secretAccessKey: s3.secretKey }
          : undefined,
    });
  }

  private bucket(visibility: FileVisibility): string {
    const s3 = this.config.storage.s3;
    return visibility === 'PRIVATE' ? s3.privateBucket : s3.publicBucket;
  }

  async put(params: PutObjectParams): Promise<StoredObject> {
    const key = this.buildKey(params.folder, params.originalName, randomBytes(16).toString('hex'));
    const bucket = this.bucket(params.visibility);
    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: params.buffer,
        ContentType: params.mimeType,
        ContentDisposition: `inline; filename="${encodeURIComponent(params.originalName)}"`,
      }),
    );
    return {
      key,
      bucket,
      size: params.buffer.byteLength,
      checksum: createHash('sha256').update(params.buffer).digest('hex'),
    };
  }

  async get(key: string, visibility: FileVisibility): Promise<Buffer> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket(visibility), Key: key }),
      );
      const bytes = await result.Body?.transformToByteArray();
      if (!bytes) throw new Error('empty body');
      return Buffer.from(bytes);
    } catch {
      throw new NotFoundException('File not found');
    }
  }

  async delete(key: string, visibility: FileVisibility): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket(visibility), Key: key }));
  }

  async signedUrl(
    key: string,
    visibility: FileVisibility,
    options: SignedUrlOptions = {},
  ): Promise<string> {
    if (visibility === 'PUBLIC' && !options.downloadName) return this.publicUrl(key);
    const command = new GetObjectCommand({
      Bucket: this.bucket(visibility),
      Key: key,
      ...(options.downloadName
        ? {
            ResponseContentDisposition: `attachment; filename="${encodeURIComponent(options.downloadName)}"`,
          }
        : {}),
      ...(options.mimeType ? { ResponseContentType: options.mimeType } : {}),
    });
    return getSignedUrl(this.client, command, {
      expiresIn: options.expiresInSeconds ?? this.config.storage.signedUrlTtlSeconds,
    });
  }

  publicUrl(key: string): string {
    const s3 = this.config.storage.s3;
    const base =
      s3.publicUrl ??
      `${(s3.endpoint ?? '').replace(/\/$/, '')}${s3.forcePathStyle ? `/${s3.publicBucket}` : ''}`;
    return `${base.replace(/\/$/, '')}/${key}`;
  }
}
