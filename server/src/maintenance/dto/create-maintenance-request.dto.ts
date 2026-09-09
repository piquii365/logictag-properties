import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { MaintenancePriority } from '../../common/enums/maintenance.enum';

export class CreateMaintenanceRequestDto {
  @IsUUID()
  unitId!: string;

  @IsString()
  @MaxLength(180)
  title!: string;

  @IsString()
  description!: string;

  @IsEnum(MaintenancePriority)
  priority!: MaintenancePriority;

  @IsOptional()
  @IsUUID()
  categoryServiceId?: string;
}
