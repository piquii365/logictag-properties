import { IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { IsMinorAmount } from '../../common/validators/is-minor-amount.decorator';

export class CreateMaintenanceJobDto {
  @IsUUID()
  vendorId!: string;

  @IsOptional()
  @IsUUID()
  quoteId?: string;

  @IsMinorAmount()
  agreedCostMinor!: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
