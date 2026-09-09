import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { IsMinorAmount } from '../../common/validators/is-minor-amount.decorator';

export class CreateUtilityChargeDto {
  @IsUUID()
  tenantId!: string;

  @IsOptional()
  @IsUUID()
  leaseId?: string;

  @IsUUID()
  unitId!: string;

  @IsUUID()
  utilityId!: string;

  @IsOptional()
  @IsUUID()
  meterId?: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsDateString()
  dueDate!: string;

  @IsMinorAmount()
  amountMinor!: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
