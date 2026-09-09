import { IsIn, IsUUID } from 'class-validator';
import type { MaintenanceAttachableType } from '../entities/maintenance-attachment.entity';

const ATTACHABLE_TYPES: MaintenanceAttachableType[] = [
  'request',
  'quote',
  'job',
];

export class AttachableRefDto {
  @IsIn(ATTACHABLE_TYPES)
  attachableType!: MaintenanceAttachableType;

  @IsUUID()
  attachableId!: string;
}
