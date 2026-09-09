import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { LeaseTenant } from '../leases/entities/lease-tenant.entity';
import { Lease } from '../leases/entities/lease.entity';
import { Unit } from '../properties/entities/unit.entity';
import { UnitStatus } from '../properties/enums/unit-status.enum';
import { Property } from '../properties/entities/property.entity';
import { UserRole } from '../auth/enums/role.enum';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { OWNER_ROLES, seesEverything } from '../common/access';
import { User } from '../users/entities/user.entity';
import { AuthProvider } from '../auth/enums/auth-provider.enum';
import { UserStatus } from '../users/enums/status.enum';
import { NotificationsService } from '../notifications/notifications.service';

/** Staff run the back office day-to-day, so they get the same visibility as
 * an admin here. ponytail: once PropertyUser assignments are enforced
 * everywhere, scope staff to their assigned properties instead. */
const isBackOffice = (user: AuthJwtPayload) =>
  seesEverything(user) || user.role === UserRole.STAFF;

@Injectable()
export class TenantsService {
  private tenants: Repository<Tenant>;
  private users: Repository<User>;
  private units: Repository<Unit>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
  ) {
    this.tenants = dataSource.getRepository(Tenant);
    this.users = dataSource.getRepository(User);
    this.units = dataSource.getRepository(Unit);
  }

  async findAll(user: AuthJwtPayload): Promise<Tenant[]> {
    if (isBackOffice(user)) {
      return this.tenants.find({ order: { lastName: 'ASC' } });
    }
    if (user.role === UserRole.TENANT) {
      return this.tenants.find({ where: { userId: user.id } });
    }
    if (OWNER_ROLES.includes(user.role)) {
      return this.scopedToOwner(user.id).getMany();
    }
    throw new ForbiddenException('Not allowed to view tenants');
  }

  async findOne(user: AuthJwtPayload, id: string): Promise<Tenant> {
    const tenant = await this.tenants.findOne({ where: { id } });
    if (!tenant || !(await this.canView(user, tenant))) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async create(user: AuthJwtPayload, dto: CreateTenantDto): Promise<Tenant> {
    this.assertManages(user);
    if (dto.unitId && !dto.userId && !dto.email) {
      throw new BadRequestException(
        'Email is required when assigning a new tenant to a unit',
      );
    }
    let userId = dto.userId ?? null;
    let temporaryPassword: string | null = null;
    if (!userId && dto.email) {
      temporaryPassword = dto.lastName.trim().toUpperCase();
      const account = await this.users.save(
        this.users.create({
          name: `${dto.firstName} ${dto.lastName}`,
          email: dto.email,
          password: temporaryPassword,
          phone: dto.phone,
          role: UserRole.TENANT,
          authProvider: AuthProvider.LOCAL,
          status: UserStatus.ACTIVE,
        }),
      );
      userId = account.id;
    }
    const { unitId, ...tenantDto } = dto;
    const tenant = await this.tenants.save(
      this.tenants.create({ ...tenantDto, userId }),
    );
    if (unitId) {
      if (!userId) {
        throw new ForbiddenException(
          'An assigned tenant must have a login account',
        );
      }
      const unit = await this.units.findOne({
        where: { id: unitId },
        relations: { property: true },
      });
      if (!unit) throw new NotFoundException('Unit not found');
      if (
        OWNER_ROLES.includes(user.role) &&
        unit.property?.ownerId !== user.id
      ) {
        throw new ForbiddenException('You do not manage this unit');
      }
      if (unit.tenantId && unit.tenantId !== userId) {
        throw new ConflictException('This unit is already occupied');
      }
      unit.tenantId = userId;
      unit.status = UnitStatus.OCCUPIED;
      await this.units.save(unit);
    }
    if (temporaryPassword && dto.email && userId) {
      await this.notifications.createSystemNotification({
        userId,
        eventType: 'tenant_account_created',
        subject: 'Your LogicTag tenant account',
        body: `Your account is ready. Sign in with ${dto.email}. Temporary password: ${temporaryPassword}. Change it after signing in.`,
        entityType: 'tenant',
        entityId: tenant.id,
      });
    }
    return tenant;
  }

  async update(
    user: AuthJwtPayload,
    id: string,
    dto: UpdateTenantDto,
  ): Promise<Tenant> {
    this.assertManages(user);
    const tenant = await this.tenants.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    Object.assign(tenant, dto);
    return this.tenants.save(tenant);
  }

  async remove(user: AuthJwtPayload, id: string): Promise<{ id: string }> {
    this.assertManages(user);
    await this.tenants.softDelete({ id });
    return { id };
  }

  private assertManages(user: AuthJwtPayload) {
    if (!isBackOffice(user) && !OWNER_ROLES.includes(user.role)) {
      throw new ForbiddenException('Not allowed to manage tenants');
    }
  }

  private async canView(
    user: AuthJwtPayload,
    tenant: Tenant,
  ): Promise<boolean> {
    if (isBackOffice(user)) {
      return true;
    }
    if (user.role === UserRole.TENANT) {
      return tenant.userId === user.id;
    }
    if (OWNER_ROLES.includes(user.role)) {
      const count = await this.scopedToOwner(user.id)
        .andWhere('tenant.id = :id', { id: tenant.id })
        .getCount();
      return count > 0;
    }
    return false;
  }

  /** Tenants with a lease on a unit in a property this landlord/PM owns. */
  private scopedToOwner(ownerId: string) {
    return this.tenants
      .createQueryBuilder('tenant')
      .innerJoin(LeaseTenant, 'lt', 'lt.tenant_id = tenant.id')
      .innerJoin(Lease, 'lease', 'lease.id = lt.lease_id')
      .innerJoin(Unit, 'unit', 'unit.id = lease.unit_id')
      .innerJoin(
        Property,
        'property',
        'property.id = unit.property_id AND property.owner_id = :ownerId',
        { ownerId },
      )
      .distinct(true);
  }
}
