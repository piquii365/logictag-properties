import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { IsMinorAmount } from '../../common/validators/is-minor-amount.decorator';

export class SubscribeDto {
  @IsUUID()
  planId!: string;

  @IsOptional()
  @IsIn(['pesepay'])
  provider?: 'pesepay';

  // managedUnits is auto-captured from occupied units; ignored if sent

  @IsOptional()
  @IsMinorAmount()
  agreedPricePerUnitMinor?: string;
}
