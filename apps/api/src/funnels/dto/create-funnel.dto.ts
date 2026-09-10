import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

export class CreateFunnelStepDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  eventName!: string;
}

export class CreateFunnelDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => CreateFunnelStepDto)
  steps!: CreateFunnelStepDto[];
}
