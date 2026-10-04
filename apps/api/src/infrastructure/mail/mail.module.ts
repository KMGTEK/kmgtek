import { Global, Module } from '@nestjs/common';
import { AppConfigService } from '../../config/config.module';
import { LogMailDriver, SmtpMailDriver } from './drivers';
import { MailService } from './mail.service';
import { MailDriver } from './mail.types';

/** Selects the mail driver from `MAIL_DRIVER` (log | smtp). */
@Global()
@Module({
  providers: [
    {
      provide: MailDriver,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): MailDriver =>
        config.mail.driver === 'smtp' ? new SmtpMailDriver(config) : new LogMailDriver(),
    },
    MailService,
  ],
  exports: [MailService, MailDriver],
})
export class MailModule {}
