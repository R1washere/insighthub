import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CreateFunnelDto } from "./dto/create-funnel.dto";
import { FunnelReportQueryDto } from "./dto/funnel-report-query.dto";
import { FunnelsService } from "./funnels.service";

@Controller("projects/:projectId/funnels")
@UseGuards(JwtAuthGuard)
export class FunnelsController {
  constructor(private readonly funnelsService: FunnelsService) {}

  @Post()
  createFunnel(
    @CurrentUser() user: AuthenticatedUser,
    @Param("projectId") projectId: string,
    @Body() dto: CreateFunnelDto,
  ) {
    return this.funnelsService.createFunnel({
      projectId,
      userId: user.id,
      name: dto.name,
      steps: dto.steps,
    });
  }

  @Get()
  listFunnels(
    @CurrentUser() user: AuthenticatedUser,
    @Param("projectId") projectId: string,
  ) {
    return this.funnelsService.listFunnels({
      projectId,
      userId: user.id,
    });
  }

  @Get(":funnelId/report")
  getFunnelReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param("projectId") projectId: string,
    @Param("funnelId") funnelId: string,
    @Query() query: FunnelReportQueryDto,
  ) {
    return this.funnelsService.getFunnelReport({
      projectId,
      funnelId,
      userId: user.id,
      days: query.days,
    });
  }
}
