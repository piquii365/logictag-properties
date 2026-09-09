import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateUnitDto {
  @IsString()
  @MaxLength(60)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  floor?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  bedrooms?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  rent?: number;
}
