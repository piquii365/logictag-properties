import { IsIn, IsUUID } from 'class-validator';
import type { AdjustableType } from '../../billing/entities/charge-adjustment.entity';
import { IsMinorAmount } from '../../common/validators/is-minor-amount.decorator';

const ALLOCATABLE_TYPES: AdjustableType[] = ['rent_charges', 'utility_charges'];

export class CreatePaymentAllocationDto {
  @IsUUID()
  paymentId!: string;

  @IsIn(ALLOCATABLE_TYPES)
  allocatableType!: AdjustableType;

  @IsUUID()
  allocatableId!: string;

  @IsMinorAmount()
  amountMinor!: string;
}
