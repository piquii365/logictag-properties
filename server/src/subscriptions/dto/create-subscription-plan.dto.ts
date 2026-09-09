import {
  IsEnum,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { BillingInterval } from '../../common/enums/subscriptions.enum';
import { IsMinorAmount } from '../../common/validators/is-minor-amount.decorator';

export class CreateSubscriptionPlanDto {
  @IsString()
  @MaxLength(80)
  code!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsMinorAmount()
  amountMinor!: string;

  @IsOptional()
  @IsMinorAmount()
  pricePerUnitMinor?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minimumUnits?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maximumUnits?: number;

  @IsOptional()
  @IsObject()
  notificationSettings?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  customPricing?: boolean;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsEnum(BillingInterval)
  billingInterval!: BillingInterval;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  trialDays?: number;

  @IsOptional()
  @IsObject()
  features?: Record<string, unknown>;
}
