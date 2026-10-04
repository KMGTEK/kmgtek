import { Body, Controller, Headers, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { trackEventSchema } from '@kmg/shared';
import { Public } from '../../common/decorators';
import { ApiZodBody } from '../../common/decorators/swagger.decorators';
import { SiteAnalyticsService } from './site-analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
export class SiteAnalyticsController {
  private readonly logger = new Logger(SiteAnalyticsController.name);

  constructor(private readonly analytics: SiteAnalyticsService) {}

  /**
   * Never rejects the request — even a malformed body just gets logged and
   * dropped, per the "always 204" contract for the tracking beacon.
   */
  @Public()
  @Post('track')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiZodBody(trackEventSchema)
  @ApiOperation({ summary: 'Record a page view (device/browser/os parsed from User-Agent)' })
  async track(@Body() body: unknown, @Headers('user-agent') userAgent: string | undefined) {
    const result = trackEventSchema.safeParse(body);
    if (!result.success) {
      this.logger.warn(`Dropped malformed /analytics/track payload: ${result.error.issues[0]?.message}`);
      return;
    }
    await this.analytics.track(result.data, userAgent);
  }
}
