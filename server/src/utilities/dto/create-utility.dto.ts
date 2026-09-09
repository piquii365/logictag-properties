import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { BillingMethod } from '../../common/enums/utilities.enum';

export class CreateUtilityDto {
  @IsUUID()
  propertyId!: string;

  @IsString()
  @MaxLength(80)
  name!: string;

  @IsString()
  @MaxLength(32)
  type!: string;

  @IsEnum(BillingMethod)
  billingMethod!: BillingMethod;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  apportionBasis?: string;
}
