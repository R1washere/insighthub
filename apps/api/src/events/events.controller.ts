import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { ListEventsQueryDto } from "./dto/list-events-query.dto";
import { TrackEventDto } from "./dto/track-event.dto";
import { EventsService } from "./events.service";

@Controller()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post("events")
  async trackEvent(
    @Headers("x-insighthub-key") apiKey: string | undefined,
    @Body() payload: TrackEventDto,
  ) {
    if (!apiKey) {
      throw new UnauthorizedException("Missing project API key");
    }

    return this.eventsService.trackEvent({
      apiKey,
      payload,
    });
  }

  @Get("projects/:projectId/events")
  @UseGuards(JwtAuthGuard)
  listProjectEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Param("projectId") projectId: string,
    @Query() query: ListEventsQueryDto,
  ) {
    return this.eventsService.listProjectEvents({
      projectId,
      userId: user.id,
      limit: query.limit,
      days: query.days,
      offset: query.offset,
      eventName: query.eventName,
    });
  }
}
