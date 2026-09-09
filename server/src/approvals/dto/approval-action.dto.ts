import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApprovalActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
