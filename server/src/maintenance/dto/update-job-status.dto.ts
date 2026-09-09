import { IsEnum, IsOptional, IsString } from 'class-validator';
import { JobStatus } from '../../common/enums/maintenance.enum';
import { IsMinorAmount } from '../../common/validators/is-minor-amount.decorator';

export class UpdateJobStatusDto {
  @IsEnum(JobStatus)
  status!: JobStatus;

  @IsOptional()
  @IsString()
  declineReason?: string;

  @IsOptional()
  @IsString()
  completionNotes?: string;

  @IsOptional()
  @IsMinorAmount()
  finalCostMinor?: string;
}
