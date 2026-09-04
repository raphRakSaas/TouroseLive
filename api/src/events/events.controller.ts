import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  listEvents() {
    return this.eventsService.listEvents();
  }

  @Get(':eventId')
  getEvent(@Param('eventId') eventId: string) {
    const payload = this.eventsService.getEvent(eventId);
    if (!payload.data) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }
    return payload;
  }
}
