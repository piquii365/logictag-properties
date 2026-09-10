import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RentFrequency } from '../../common/enums/leasing.enum';
import { IsMinorAmount } from '../../common/validators/is-minor-amount.decorator';

export class CreateLeaseDto {
  @IsUUID()
  unitId!: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  reference?: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsMinorAmount()
  rentAmountMinor!: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsEnum(RentFrequency)
  frequency!: RentFrequency;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  rentDueDay?: number;

  @IsOptional()
  @IsMinorAmount()
  depositMinor?: string;
}
