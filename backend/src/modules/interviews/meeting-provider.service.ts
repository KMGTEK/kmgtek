import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

/**
 * Abstraction over "generate me a meeting link". The default implementation
 * uses Jitsi (no account/API key needed); a Zoom/Google Meet/Teams provider
 * can be swapped in later by implementing the same interface and rebinding it
 * in `InterviewsModule`.
 */
export abstract class MeetingProviderService {
  abstract generateLink(seed?: string): Promise<string>;
}

@Injectable()
export class JitsiMeetingProvider extends MeetingProviderService {
  async generateLink(): Promise<string> {
    const slug = randomBytes(6).toString('hex').slice(0, 10);
    return `https://meet.jit.si/kmg-${slug}`;
  }
}
