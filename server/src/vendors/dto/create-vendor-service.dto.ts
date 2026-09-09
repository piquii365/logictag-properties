import { IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import type { VendorRateType } from '../entities/vendor-service.entity';
import { IsMinorAmount } from '../../common/validators/is-minor-amount.decorator';

const RATE_TYPES: VendorRateType[] = ['hourly', 'fixed', 'quote_only'];

export class CreateVendorServiceDto {
  @IsUUID()
  serviceId!: string;

  @IsOptional()
  @IsIn(RATE_TYPES)
  rateType?: VendorRateType;

  @IsOptional()
  @IsMinorAmount()
  rateMinor?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
