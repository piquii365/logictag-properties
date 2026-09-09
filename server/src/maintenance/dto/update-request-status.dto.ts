import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MaintenanceStatus } from '../../common/enums/maintenance.enum';

export class UpdateRequestStatusDto {
  @IsEnum(MaintenanceStatus)
  status!: MaintenanceStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
