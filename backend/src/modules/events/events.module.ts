import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppEventsService } from './app-events.service';
import { AuthEventsListener } from './auth-events.listener';

/**
 * Domain events. Other modules import nothing — they inject `AppEventsService`
 * to emit and use `@OnEvent(EVENTS.X)` to subscribe.
 */
@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),
  ],
  providers: [AppEventsService, AuthEventsListener],
  exports: [AppEventsService],
})
export class EventsModule {}
