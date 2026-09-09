import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateApprovalDto {
  @IsString()
  @MaxLength(32)
  workflowType!: string;

  @IsString()
  @MaxLength(32)
  entityType!: string;

  @IsUUID()
  entityId!: string;

  @IsUUID()
  assignedTo!: string;
}
