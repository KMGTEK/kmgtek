import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { AppConfigService } from '../../config/config.module';
import { MailDriver, type OutgoingMessage } from './mail.types';

/** Development driver: prints the message instead of sending it. */
@Injectable()
export class LogMailDriver extends MailDriver {
  private readonly logger = new Logger('MailDriver:log');

  async send(message: OutgoingMessage): Promise<void> {
    this.logger.log(
      `✉️  to=${message.to} subject="${message.subject}"${
        message.attachments?.length ? ` attachments=${message.attachments.map((a) => a.filename).join(',')}` : ''
      }`,
    );
    this.logger.debug(message.text.slice(0, 2000));
  }
}

@Injectable()
export class SmtpMailDriver extends MailDriver {
  private readonly transporter: Transporter;

  constructor(config: AppConfigService) {
    super();
    const smtp = config.mail.smtp;
    this.transporter = createTransport({
      host: smtp.host ?? 'localhost',
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.pass ?? '' } : undefined,
    });
  }

  async send(message: OutgoingMessage): Promise<void> {
    await this.transporter.sendMail({
      from: message.from,
      to: message.to,
      cc: message.cc,
      replyTo: message.replyTo,
      subject: message.subject,
      html: message.html,
      text: message.text,
      attachments: message.attachments,
    });
  }
}
