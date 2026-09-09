import {
  IsBoolean,
  IsDateString,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateTaxRuleDto {
  @IsString()
  @MaxLength(32)
  code!: string;

  @IsString()
  @MaxLength(32)
  taxType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  jurisdiction?: string;

  @IsNumberString()
  rate!: string;

  @IsString()
  @MaxLength(64)
  calculationMethod!: string;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsString()
  @MaxLength(255)
  sourceName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sourceReference?: string;

  @IsOptional()
  version?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
