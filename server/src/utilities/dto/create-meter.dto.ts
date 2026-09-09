import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMeterDto {
  @IsUUID()
  unitId!: string;

  @IsUUID()
  utilityId!: string;

  @IsString()
  @MaxLength(64)
  meterNumber!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  digits?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  multiplier?: number;

  @IsOptional()
  @IsDateString()
  installedOn?: string;
}
