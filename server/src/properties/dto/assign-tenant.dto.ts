import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class AssignTenantDto {
  /** null clears the tenancy and marks the unit vacant. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  tenantId?: string | null;
}
