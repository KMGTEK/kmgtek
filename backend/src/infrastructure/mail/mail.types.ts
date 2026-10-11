import type { EmailTemplateKey } from '@kmg/shared';

export interface MailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

/** Send a DB-stored template… */
export interface TemplateMail {
  to: string | string[];
  templateKey: EmailTemplateKey;
  variables?: Record<string, unknown>;
  attachments?: MailAttachment[];
  cc?: string | string[];
  replyTo?: string;
}

/** …or an ad-hoc message (used by the "send test email" endpoint). */
export interface RawMail {
  to: string | string[];
  subject: string;
  html: string;
  templateKey?: string;
  attachments?: MailAttachment[];
  cc?: string | string[];
  replyTo?: string;
}

export interface OutgoingMessage {
  from: string;
  to: string;
  cc?: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  attachments?: MailAttachment[];
}

/** Transport abstraction: `log` in local dev, `smtp` everywhere else. */
export abstract class MailDriver {
  abstract send(message: OutgoingMessage): Promise<void>;
}
