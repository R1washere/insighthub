import { Module } from "@nestjs/common";
import { ApiKeyModule } from "../api-keys/api-key.module";
import { AuthModule } from "../auth/auth.module";
import { ProjectsModule } from "../projects/projects.module";
import { EventsController } from "./events.controller";
import { EventsService } from "./events.service";
import { IngestionRateLimitService } from "./ingestion-rate-limit.service";

@Module({
  imports: [ApiKeyModule, AuthModule, ProjectsModule],
  controllers: [EventsController],
  providers: [EventsService, IngestionRateLimitService],
})
export class EventsModule {}
