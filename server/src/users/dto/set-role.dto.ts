import { IsEnum } from 'class-validator';
import { UserRole } from '../../auth/enums/role.enum';

export class SetRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}
