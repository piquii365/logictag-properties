import type { Repository } from 'typeorm';
import { UserRole } from '../auth/enums/role.enum';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { Unit } from '../properties/entities/unit.entity';
import { Property } from '../properties/entities/property.entity';

/** Landlords and property managers own/manage properties; nobody else does. */
export const OWNER_ROLES: readonly UserRole[] = [
  UserRole.LANDLORD,
  UserRole.PROPERTY_MANAGER,
];

/** Admins bypass every ownership scope and see all rows. */
export const seesEverything = (user: AuthJwtPayload) =>
  user.role === UserRole.ADMIN;

/** True if `unitId` sits in a property owned by `ownerId`. Shared by every
 * module that scopes a unit-linked resource (leases, maintenance, utilities)
 * to the landlord/PM who owns it. */
export async function unitBelongsToOwner(
  units: Repository<Unit>,
  ownerId: string,
  unitId: string,
): Promise<boolean> {
  const count = await units
    .createQueryBuilder('unit')
    .innerJoin(
      Property,
      'property',
      'property.id = unit.property_id AND property.owner_id = :ownerId',
      { ownerId },
    )
    .andWhere('unit.id = :unitId', { unitId })
    .getCount();
  return count > 0;
}
