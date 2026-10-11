import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { WebsiteSettings } from '@kmg/shared';
import { AppConfigService } from '../../config/config.module';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  PRIVATE_SETTINGS_GROUPS,
  SETTINGS_GROUPS,
  defaultSettings,
  type SettingsGroupName,
} from './settings.defaults';

/**
 * Website settings, one JSON row per group, cached in memory.
 *
 * ```ts
 * const { company, seo } = await this.settings.getAll();
 * ```
 */
@Injectable()
export class SettingsService {
  private cache: Required<WebsiteSettings> | null = null;
  private cachedAt = 0;
  private readonly ttlMs = 60_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  private defaults(): Required<WebsiteSettings> {
    return defaultSettings({
      mailFromName: this.config.mail.fromName,
      mailFromAddress: this.config.mail.fromAddress,
      notifyAddresses: this.config.mail.notifyAddresses,
    });
  }

  /** Drop the cache (called after every write). */
  invalidate(): void {
    this.cache = null;
    this.cachedAt = 0;
  }

  async getAll(): Promise<Required<WebsiteSettings>> {
    if (this.cache && Date.now() - this.cachedAt < this.ttlMs) return this.cache;

    const rows = await this.prisma.websiteSetting.findMany();
    const merged = this.defaults();
    for (const row of rows) {
      if ((SETTINGS_GROUPS as readonly string[]).includes(row.group)) {
        const group = row.group as SettingsGroupName;
        merged[group] = { ...(merged[group] as object), ...(row.value as object) } as never;
      }
    }
    this.cache = merged;
    this.cachedAt = Date.now();
    return merged;
  }

  /** Everything except the private groups (currently `email`). */
  async getPublic(): Promise<WebsiteSettings> {
    const all = await this.getAll();
    const result = { ...all } as Partial<Required<WebsiteSettings>>;
    for (const group of PRIVATE_SETTINGS_GROUPS) delete result[group];
    return result as WebsiteSettings;
  }

  async getGroup<K extends SettingsGroupName>(group: K): Promise<Required<WebsiteSettings>[K]> {
    return (await this.getAll())[group];
  }

  async update(
    group: string,
    value: Record<string, unknown>,
    updatedBy?: string,
  ): Promise<Required<WebsiteSettings>> {
    if (!(SETTINGS_GROUPS as readonly string[]).includes(group)) {
      throw new BadRequestException(`Unknown settings group "${group}"`);
    }
    const isPublic = !PRIVATE_SETTINGS_GROUPS.includes(group as SettingsGroupName);
    const data = value as Prisma.InputJsonValue;

    await this.prisma.websiteSetting.upsert({
      where: { group },
      create: { group, value: data, isPublic, updatedBy: updatedBy ?? null },
      update: { value: data, isPublic, updatedBy: updatedBy ?? null },
    });
    this.invalidate();
    return this.getAll();
  }
}
