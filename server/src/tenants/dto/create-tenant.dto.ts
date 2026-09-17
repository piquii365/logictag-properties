import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { RentFrequency } from '../../common/enums/leasing.enum';

export class CreateTenantDto {
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MaxLength(100)
  lastName!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MaxLength(32)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  nationalId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Links this tenant record to an existing login. Admin/back-office only. */
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

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
}
