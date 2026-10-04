import { Injectable, Logger } from '@nestjs/common';
import type { TrackEventInput } from '@kmg/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { parseUserAgent } from './ua-parser.util';

@Injectable()
export class SiteAnalyticsService {
  private readonly logger = new Logger(SiteAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Never throws — analytics must not break the page it is tracking. */
  async track(input: TrackEventInput, userAgent: string | undefined): Promise<void> {
    try {
      const { device, browser, os } = parseUserAgent(userAgent);
      await this.prisma.pageView.create({
        data: {
          sessionId: input.sessionId,
          path: input.path,
          title: input.title ?? null,
          referrer: input.referrer ?? null,
          utmSource: input.utmSource ?? null,
          utmMedium: input.utmMedium ?? null,
          utmCampaign: input.utmCampaign ?? null,
          device,
          browser,
          os,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to record page view: ${(error as Error).message}`);
    }
  }
}
