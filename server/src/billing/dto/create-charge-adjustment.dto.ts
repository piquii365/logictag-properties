import { IsIn, IsString, IsUUID, MinLength } from 'class-validator';
import type {
  AdjustableType,
  ChargeAdjustmentType,
} from '../entities/charge-adjustment.entity';
import { IsMinorAmount } from '../../common/validators/is-minor-amount.decorator';

const ADJUSTABLE_TYPES: AdjustableType[] = ['rent_charges', 'utility_charges'];
const ADJUSTMENT_TYPES: ChargeAdjustmentType[] = [
  'waiver',
  'discount',
  'penalty',
  'correction',
];

export class CreateChargeAdjustmentDto {
  @IsIn(ADJUSTABLE_TYPES)
  adjustableType!: AdjustableType;

  @IsUUID()
  adjustableId!: string;

  @IsIn(ADJUSTMENT_TYPES)
  type!: ChargeAdjustmentType;

  @IsMinorAmount()
  amountMinor!: string;

  @IsString()
  @MinLength(2)
  reason!: string;
}
