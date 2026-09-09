import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class AddLeaseTenantDto {
  @IsUUID()
  tenantId!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
