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
import { RentFrequency } from '../../common/enums/leasing.enum';

export class AssignTenantDto {
  /** null clears the tenancy and marks the unit vacant. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  tenantId?: string | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  rent?: number;

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
