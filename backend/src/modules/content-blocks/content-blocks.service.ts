import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  CONTENT_BLOCK_KEYS,
  CONTENT_BLOCK_META,
  CONTENT_BLOCK_SCHEMAS,
  DEFAULT_CONTENT_BLOCKS,
  type ContentBlockKey,
} from '@kmg/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { validateWith } from '../../common/pipes/zod-validation.pipe';

export interface AdminContentBlockDto {
  key: ContentBlockKey;
  label: string;
  group: string;
  data: unknown;
  updatedAt: string | null;
}

/** Type guard: is `key` one of the registered content block keys? */
export function isContentBlockKey(key: string): key is ContentBlockKey {
  return (CONTENT_BLOCK_KEYS as readonly string[]).includes(key);
}

@Injectable()
export class ContentBlocksService {
  constructor(private readonly prisma: PrismaService) {}

  /** All 13 keys, default-merged with whatever is customized in the DB. */
  async getAll(): Promise<Record<ContentBlockKey, unknown>> {
    const rows = await this.prisma.contentBlock.findMany();
    const byKey = new Map(rows.map((row) => [row.key, row.data]));

    const result = {} as Record<ContentBlockKey, unknown>;
    for (const key of CONTENT_BLOCK_KEYS) {
      result[key] = byKey.has(key) ? byKey.get(key) : DEFAULT_CONTENT_BLOCKS[key];
    }
    return result;
  }

  /** One key's data, default-merged. Throws if `key` isn't a registered content block key. */
  async getOne(key: string): Promise<unknown> {
    if (!isContentBlockKey(key)) throw new NotFoundException(`Unknown content block "${key}"`);
    const row = await this.prisma.contentBlock.findUnique({ where: { key } });
    return row ? row.data : DEFAULT_CONTENT_BLOCKS[key];
  }

  /** Admin list: every key with label/group metadata, default-merged data and a nullable `updatedAt`. */
  async adminList(): Promise<AdminContentBlockDto[]> {
    const rows = await this.prisma.contentBlock.findMany();
    const byKey = new Map(rows.map((row) => [row.key, row]));

    return CONTENT_BLOCK_KEYS.map((key) => {
      const row = byKey.get(key);
      const meta = CONTENT_BLOCK_META[key];
      return {
        key,
        label: meta.label,
        group: meta.group,
        data: row ? row.data : DEFAULT_CONTENT_BLOCKS[key],
        updatedAt: row ? row.updatedAt.toISOString() : null,
      };
    });
  }

  async adminGet(key: string): Promise<AdminContentBlockDto> {
    if (!isContentBlockKey(key)) throw new NotFoundException(`Unknown content block "${key}"`);
    const row = await this.prisma.contentBlock.findUnique({ where: { key } });
    const meta = CONTENT_BLOCK_META[key];
    return {
      key,
      label: meta.label,
      group: meta.group,
      data: row ? row.data : DEFAULT_CONTENT_BLOCKS[key],
      updatedAt: row ? row.updatedAt.toISOString() : null,
    };
  }

  /** Validate `body` against `key`'s schema and upsert it. Throws `NotFoundException`/`BadRequestException`. */
  async update(key: string, body: unknown, updatedBy?: string): Promise<AdminContentBlockDto> {
    if (!isContentBlockKey(key)) throw new NotFoundException(`Unknown content block "${key}"`);
    const parsed = validateWith(CONTENT_BLOCK_SCHEMAS[key], body);

    const row = await this.prisma.contentBlock.upsert({
      where: { key },
      create: { key, data: parsed as Prisma.InputJsonValue, updatedBy: updatedBy ?? null },
      update: { data: parsed as Prisma.InputJsonValue, updatedBy: updatedBy ?? null },
    });

    const meta = CONTENT_BLOCK_META[key];
    return { key, label: meta.label, group: meta.group, data: row.data, updatedAt: row.updatedAt.toISOString() };
  }

  /** Delete the row for `key`, reverting reads to the default. Idempotent. */
  async reset(key: string): Promise<void> {
    if (!isContentBlockKey(key)) throw new NotFoundException(`Unknown content block "${key}"`);
    await this.prisma.contentBlock.deleteMany({ where: { key } });
  }
}
