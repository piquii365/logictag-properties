import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { IsMinorAmount } from '../../common/validators/is-minor-amount.decorator';

export class CreateTaxObligationDto {
  @IsUUID()
  zimraProfileId!: string;

  @IsString()
  @MaxLength(32)
  taxType!: string;

  @IsString()
  @MaxLength(32)
  liablePartyType!: string;

  @IsOptional()
  @IsUUID()
  liablePartyId?: string;

  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsUUID()
  leaseId?: string;

  @IsDateString()
  taxPeriodStart!: string;

  @IsDateString()
  taxPeriodEnd!: string;

  @IsMinorAmount()
  taxableAmount!: string;

  @IsDateString()
  dueDate!: string;

  @IsString()
  currency!: string;
}
