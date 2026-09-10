import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CreateProjectApiKeyDto } from "./dto/create-project-api-key.dto";
import { CreateProjectDto } from "./dto/create-project.dto";
import { ProjectsService } from "./projects.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post("organizations/:organizationId/projects")
  createProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param("organizationId") organizationId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.createProject({
      organizationId,
      userId: user.id,
      name: dto.name,
      timezone: dto.timezone,
    });
  }

  @Get("organizations/:organizationId/projects")
  listProjects(
    @CurrentUser() user: AuthenticatedUser,
    @Param("organizationId") organizationId: string,
  ) {
    return this.projectsService.listProjects({
      organizationId,
      userId: user.id,
    });
  }

  @Get("projects/:projectId")
  getProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param("projectId") projectId: string,
  ) {
    return this.projectsService.getProject({
      projectId,
      userId: user.id,
    });
  }

  @Post("projects/:projectId/api-keys")
  createApiKey(
    @CurrentUser() user: AuthenticatedUser,
    @Param("projectId") projectId: string,
    @Body() dto: CreateProjectApiKeyDto,
  ) {
    return this.projectsService.createProjectApiKey({
      projectId,
      userId: user.id,
      name: dto.name,
    });
  }

  @Delete("projects/:projectId/api-keys/:apiKeyId")
  revokeApiKey(
    @CurrentUser() user: AuthenticatedUser,
    @Param("projectId") projectId: string,
    @Param("apiKeyId") apiKeyId: string,
  ) {
    return this.projectsService.revokeProjectApiKey({
      projectId,
      apiKeyId,
      userId: user.id,
    });
  }
}
