import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { IsMinorAmount } from '../../common/validators/is-minor-amount.decorator';

export class CreateMaintenanceQuoteDto {
  @IsMinorAmount()
  amountMinor!: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  estimatedDays?: number;

  @IsDateString()
  validUntil!: string;
}
