import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';
import {
  PaymentMethod,
  PaymentProvider,
} from '../../common/enums/billing.enum';
import { IsMinorAmount } from '../../common/validators/is-minor-amount.decorator';

export class CreatePaymentDto {
  @IsUUID()
  tenantId!: string;

  @IsOptional()
  @IsUUID()
  leaseId?: string;

  @IsMinorAmount()
  amountMinor!: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  providerReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  providerMethodCode?: string;
}
