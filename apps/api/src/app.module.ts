import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { AppConfigService, ConfigModule } from './config/config.module';
import { buildThrottlerOptions } from './infrastructure/cache/throttler.config';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { MailModule } from './infrastructure/mail/mail.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CandidatesModule } from './modules/candidates/candidates.module';
import { CaseStudiesModule } from './modules/case-studies/case-studies.module';
import { ContentBlocksModule } from './modules/content-blocks/content-blocks.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EmailTemplatesModule } from './modules/email-templates/email-templates.module';
import { EventsModule } from './modules/events/events.module';
import { HealthModule } from './modules/health/health.module';
import { InterviewsModule } from './modules/interviews/interviews.module';
import { JobCategoriesModule } from './modules/job-categories/job-categories.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { LeadsModule } from './modules/leads/leads.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { RecruitmentEventsModule } from './modules/recruitment-events/recruitment-events.module';
import { SearchModule } from './modules/search/search.module';
import { ServicesModule } from './modules/services/services.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SiteAnalyticsModule } from './modules/site-analytics/site-analytics.module';
import { SitemapModule } from './modules/sitemap/sitemap.module';
import { TeamMembersModule } from './modules/team-members/team-members.module';
import { TechnologiesModule } from './modules/technologies/technologies.module';
import { TestimonialsModule } from './modules/testimonials/testimonials.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { UsersModule } from './modules/users/users.module';

/**
 * Foundation module graph. Domain modules added later only need to be listed in
 * `imports` — infrastructure (config, prisma, storage, mail, events, audit,
 * notifications, settings, rbac) is global and injectable everywhere.
 */
@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    PrismaModule,
    StorageModule,
    MailModule,
    EventsModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: buildThrottlerOptions,
    }),
    AuditModule,
    RbacModule,
    AuthModule,
    UsersModule,
    NotificationsModule,
    SettingsModule,
    EmailTemplatesModule,
    UploadsModule,
    HealthModule,
    RecruitmentEventsModule,
    JobCategoriesModule,
    JobsModule,
    CandidatesModule,
    ApplicationsModule,
    InterviewsModule,
    DashboardModule,
    AnalyticsModule,
    ServicesModule,
    TechnologiesModule,
    TeamMembersModule,
    TestimonialsModule,
    CaseStudiesModule,
    LeadsModule,
    SearchModule,
    SitemapModule,
    SiteAnalyticsModule,
    ContentBlocksModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*splat');
  }
}
