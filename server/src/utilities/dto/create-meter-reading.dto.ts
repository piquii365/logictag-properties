import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateMeterReadingDto {
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  reading!: number;

  @IsDateString()
  readingDate!: string;

  @IsOptional()
  @IsBoolean()
  isEstimated?: boolean;

  @IsOptional()
  @IsString()
  overrideReason?: string;
}
