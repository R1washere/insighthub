import type { TrackedEventPayload } from "@insighthub/shared";
import {
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class TrackEventDto implements TrackedEventPayload {
  @IsString()
  @MinLength(1)
  event!: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  anonymousId?: string;

  @IsOptional()
  @IsISO8601()
  timestamp?: string;

  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;
}
