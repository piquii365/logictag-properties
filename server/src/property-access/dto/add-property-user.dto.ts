import { IsIn, IsUUID } from 'class-validator';
import type { PropertyUserRole } from '../entities/property-user.entity';

const ROLES: PropertyUserRole[] = ['manager', 'staff'];

export class AddPropertyUserDto {
  @IsUUID()
  userId!: string;

  @IsIn(ROLES)
  role!: PropertyUserRole;
}
