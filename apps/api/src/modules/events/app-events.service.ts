import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { EventName, EventPayloads } from './event-names';

/**
 * Type-safe wrapper around `EventEmitter2`.
 *
 * ```ts
 * this.events.emit(EVENTS.APPLICATION_CREATED, { applicationId });
 *
 * // elsewhere
 * @OnEvent(EVENTS.APPLICATION_CREATED)
 * handle(payload: ApplicationCreatedPayload) {}
 * ```
 */
@Injectable()
export class AppEventsService {
  constructor(private readonly emitter: EventEmitter2) {}

  emit<K extends EventName>(event: K, payload: EventPayloads[K]): void {
    this.emitter.emit(event, payload);
  }

  /** Await every (async) listener — useful in tests. */
  async emitAsync<K extends EventName>(event: K, payload: EventPayloads[K]): Promise<unknown[]> {
    return this.emitter.emitAsync(event, payload);
  }
}
