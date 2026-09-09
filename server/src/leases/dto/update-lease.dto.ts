import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateLeaseDto } from './create-lease.dto';
import { LeaseStatus } from '../../common/enums/leasing.enum';

// unitId is omitted: moving a lease to another unit isn't an edit, it's a
// new lease.
export class UpdateLeaseDto extends PartialType(
  OmitType(CreateLeaseDto, ['unitId'] as const),
) {
  @IsOptional()
  @IsEnum(LeaseStatus)
  status?: LeaseStatus;

  @IsOptional()
  @IsString()
  terminationReason?: string;
}
