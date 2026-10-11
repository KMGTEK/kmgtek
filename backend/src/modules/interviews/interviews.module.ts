import { Module } from '@nestjs/common';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';
import { JitsiMeetingProvider, MeetingProviderService } from './meeting-provider.service';

@Module({
  controllers: [InterviewsController],
  providers: [InterviewsService, { provide: MeetingProviderService, useClass: JitsiMeetingProvider }],
  exports: [InterviewsService],
})
export class InterviewsModule {}
