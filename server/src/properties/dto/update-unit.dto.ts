import { PartialType } from '@nestjs/mapped-types';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateIf,
} from 'class-validator';
import { CreateUnitDto } from './create-unit.dto';
import { RentFrequency } from '../../common/enums/leasing.enum';

export class UpdateUnitDto extends PartialType(CreateUnitDto) {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  tenantId?: string | null;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsEnum(RentFrequency)
  frequency?: RentFrequency;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  deposit?: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
