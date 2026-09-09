import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentStatus } from '../../common/enums/billing.enum';

export class UpdatePaymentStatusDto {
  @IsEnum(PaymentStatus)
  status!: PaymentStatus;

  @IsOptional()
  @IsString()
  failureReason?: string;
}
