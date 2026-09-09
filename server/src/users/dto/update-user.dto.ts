import { PickType } from '@nestjs/mapped-types';
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

/**
 * The DTO is the allowlist. Email changes need verification, password goes
 * through /auth/change-password, and role is admin-only (PATCH /users/:id/role),
 * so none of them are editable here — the global ValidationPipe rejects a
 * request that tries.
 */
export class UpdateUserDto extends PartialType(
  PickType(CreateUserDto, ['name', 'phone'] as const),
) {}
