import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../enums/role.enum';

/** Roles a person may pick for themselves at sign-up. ADMIN is not one. */
const SELF_ASSIGNABLE_ROLES = [
  UserRole.LANDLORD,
  UserRole.PROPERTY_MANAGER,
  UserRole.STAFF,
  UserRole.TENANT,
  UserRole.VENDOR,
] as const;

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt silently truncates past 72 bytes
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsEnum(SELF_ASSIGNABLE_ROLES, {
    message: `role must be one of: ${SELF_ASSIGNABLE_ROLES.join(', ')}`,
  })
  role?: UserRole;
}
