import { Module } from '@nestjs/common';
import { RecruitmentEventsListener } from './recruitment-events.listener';

/**
 * Mail + in-app notifications for `application.created`, `application.status_changed`
 * and `interview.scheduled` (emitted by the jobs/applications/interviews modules).
 */
@Module({
  providers: [RecruitmentEventsListener],
})
export class RecruitmentEventsModule {}
