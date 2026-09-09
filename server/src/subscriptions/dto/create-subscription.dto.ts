import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { SubscriptionStatus } from '../../common/enums/subscriptions.enum';
import { IsMinorAmount } from '../../common/validators/is-minor-amount.decorator';

/** Admin-only: create a subscription for a specific user. */
export class CreateSubscriptionDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  planId!: string;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  trialEndsAt?: string;

  @IsOptional()
  @IsDateString()
  currentPeriodStart?: string;

  @IsOptional()
  @IsDateString()
  currentPeriodEnd?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  managedUnits?: number;

  @IsOptional()
  @IsMinorAmount()
  agreedPricePerUnitMinor?: string;

  @IsOptional()
  @IsIn(['pesepay'])
  provider?: 'pesepay';
}
