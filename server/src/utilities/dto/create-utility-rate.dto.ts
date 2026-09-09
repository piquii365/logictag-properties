import {
  IsDateString,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { IsMinorAmount } from '../../common/validators/is-minor-amount.decorator';

export class CreateUtilityRateDto {
  @IsMinorAmount()
  rateMinor!: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  unitLabel?: string;

  @IsOptional()
  @IsMinorAmount()
  standingChargeMinor?: string;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
