import { Module } from '@nestjs/common';
import { AdminLeadsController } from './admin-leads.controller';
import { AdminLeadsService } from './admin-leads.service';
import { LeadsController } from './leads.controller';
import { LeadsEventsListener } from './leads-events.listener';
import { LeadsService } from './leads.service';

@Module({
  controllers: [LeadsController, AdminLeadsController],
  providers: [LeadsService, AdminLeadsService, LeadsEventsListener],
  exports: [LeadsService, AdminLeadsService],
})
export class LeadsModule {}
