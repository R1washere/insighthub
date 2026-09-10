import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { AnalyticsService } from "./analytics.service";
import { AnalyticsQueryDto } from "./dto/analytics-query.dto";

@Controller("projects/:projectId/analytics")
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("overview")
  getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Param("projectId") projectId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getOverview({
      projectId,
      userId: user.id,
      days: query.days,
      limit: query.limit,
    });
  }

  @Get("summary")
  getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param("projectId") projectId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getSummary({
      projectId,
      userId: user.id,
      days: query.days,
    });
  }

  @Get("events-over-time")
  getEventsOverTime(
    @CurrentUser() user: AuthenticatedUser,
    @Param("projectId") projectId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getEventsOverTime({
      projectId,
      userId: user.id,
      days: query.days,
    });
  }

  @Get("top-events")
  getTopEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Param("projectId") projectId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getTopEvents({
      projectId,
      userId: user.id,
      days: query.days,
      limit: query.limit,
    });
  }

  @Get("recent-activity")
  getRecentActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Param("projectId") projectId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getRecentActivity({
      projectId,
      userId: user.id,
      limit: query.limit,
    });
  }
}
