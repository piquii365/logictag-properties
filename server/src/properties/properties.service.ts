import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Property } from './entities/property.entity';
import { Unit } from './entities/unit.entity';
import { UnitStatus } from './enums/unit-status.enum';
import { UserRole } from '../auth/enums/role.enum';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { AssignTenantDto } from './dto/assign-tenant.dto';
import { User } from '../users/entities/user.entity';
import { Lease } from '../leases/entities/lease.entity';
import { LeaseTenant } from '../leases/entities/lease-tenant.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { LeaseStatus, RentFrequency } from '../common/enums/leasing.enum';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

/**
 * Who owns properties. Everyone else either rents (TENANT) or is attached to
 * a property through a unit; neither gets to create or edit one.
 */
const OWNER_ROLES: readonly UserRole[] = [
  UserRole.LANDLORD,
  UserRole.PROPERTY_MANAGER,
];

/**
 * Admins are the one exception to per-owner scoping: they see and administer
 * every property. Flip this single predicate if admins should instead be
 * confined to properties they personally own.
 */
const seesEverything = (user: AuthJwtPayload) => user.role === UserRole.ADMIN;

@Injectable()
export class PropertiesService {
  private properties: Repository<Property>;
  private units: Repository<Unit>;
  private users: Repository<User>;
  private leases: Repository<Lease>;
  private leaseTenants: Repository<LeaseTenant>;
  private tenants: Repository<Tenant>;

  constructor(
    dataSource: DataSource,
    private readonly subscriptions: SubscriptionsService,
  ) {
    this.properties = dataSource.getRepository(Property);
    this.units = dataSource.getRepository(Unit);
    this.users = dataSource.getRepository(User);
    this.leases = dataSource.getRepository(Lease);
    this.leaseTenants = dataSource.getRepository(LeaseTenant);
    this.tenants = dataSource.getRepository(Tenant);
  }

  // ── Properties ────────────────────────────────────────────────

  async findAll(user: AuthJwtPayload): Promise<Property[]> {
    if (seesEverything(user)) {
      return this.properties.find({ order: { name: 'ASC' } });
    }
    if (user.role === UserRole.TENANT) {
      // A tenant only ever sees the properties they actually rent a unit in.
      return this.properties
        .createQueryBuilder('property')
        .innerJoin('property.units', 'unit', 'unit.tenant_id = :tenantId', {
          tenantId: user.id,
        })
        .distinct(true)
        .orderBy('property.name', 'ASC')
        .getMany();
    }
    return this.properties.find({
      where: { ownerId: user.id },
      order: { name: 'ASC' },
    });
  }

  /**
   * The single read gate. Every property-scoped route goes through here, so
   * there is one place where "can this person see this property?" is decided.
   */
  async findOne(user: AuthJwtPayload, id: string): Promise<Property> {
    const property = await this.properties.findOne({ where: { id } });
    // A property that exists but isn't yours is reported as missing, so the
    // endpoint can't be used to probe for other landlords' property ids.
    if (!property || !(await this.canView(user, property))) {
      throw new NotFoundException('Property not found');
    }
    return property;
  }

  async create(
    user: AuthJwtPayload,
    dto: CreatePropertyDto,
  ): Promise<Property> {
    if (!seesEverything(user) && !OWNER_ROLES.includes(user.role)) {
      throw new ForbiddenException(
        'Only landlords and property managers can create properties',
      );
    }
    // Only an admin may file a property under someone else's name.
    const ownerId = dto.ownerId && seesEverything(user) ? dto.ownerId : user.id;
    return this.properties.save(
      this.properties.create({
        name: dto.name,
        address: dto.address,
        city: dto.city ?? null,
        imageUrls: dto.imageUrls ?? [],
        ownerId,
      }),
    );
  }

  async update(
    user: AuthJwtPayload,
    id: string,
    dto: UpdatePropertyDto,
  ): Promise<Property> {
    const property = await this.findManageable(user, id);
    Object.assign(property, dto);
    return this.properties.save(property);
  }

  async addImage(user: AuthJwtPayload, id: string, file: Express.Multer.File) {
    const property = await this.findManageable(user, id);
    property.imageUrls = [
      ...(property.imageUrls ?? []),
      `/uploads/properties/${file.filename}`,
    ];
    return this.properties.save(property);
  }

  async remove(user: AuthJwtPayload, id: string): Promise<{ id: string }> {
    const property = await this.findManageable(user, id);
    await this.properties.delete({ id: property.id });
    return { id };
  }

  // ── Units ─────────────────────────────────────────────────────

  async findUnits(user: AuthJwtPayload, propertyId: string): Promise<Unit[]> {
    // Throws if the property isn't visible to this person.
    await this.findOne(user, propertyId);
    const where =
      user.role === UserRole.TENANT && !seesEverything(user)
        ? { propertyId, tenantId: user.id }
        : { propertyId };
    return this.units.find({
      where,
      relations: { tenant: true },
      order: { label: 'ASC' },
    });
  }

  /** Every unit the caller can see, across properties. */
  async findMyUnits(user: AuthJwtPayload): Promise<Unit[]> {
    if (seesEverything(user)) {
      return this.units.find({
        relations: { tenant: true },
        order: { label: 'ASC' },
      });
    }
    if (user.role === UserRole.TENANT) {
      return this.units.find({
        where: { tenantId: user.id },
        relations: { tenant: true, property: true },
        order: { label: 'ASC' },
      });
    }
    return this.units
      .createQueryBuilder('unit')
      .leftJoinAndSelect('unit.tenant', 'tenant')
      .innerJoin('unit.property', 'property', 'property.owner_id = :ownerId', {
        ownerId: user.id,
      })
      .orderBy('unit.label', 'ASC')
      .getMany();
  }

  async findUnit(user: AuthJwtPayload, unitId: string): Promise<Unit> {
    const unit = await this.units.findOne({
      where: { id: unitId },
      relations: { tenant: true, property: true },
    });
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }
    // A tenant reaches a unit through their tenancy, not through the property.
    if (user.role === UserRole.TENANT && !seesEverything(user)) {
      if (unit.tenantId !== user.id) {
        throw new NotFoundException('Unit not found');
      }
      return unit;
    }
    await this.findOne(user, unit.propertyId);
    return unit;
  }

  async createUnit(
    user: AuthJwtPayload,
    propertyId: string,
    dto: CreateUnitDto,
  ): Promise<Unit> {
    await this.findManageable(user, propertyId);
    return this.units.save(
      this.units.create({
        propertyId,
        label: dto.label,
        floor: dto.floor ?? null,
        bedrooms: dto.bedrooms ?? 0,
        rent: dto.rent !== undefined ? String(dto.rent) : '0',
        status: UnitStatus.VACANT,
      }),
    );
  }

  async syncDraftLease(params: {
    unitId: string;
    tenantId?: string | null;
    rentAmount?: number | null;
    startDate?: string;
    frequency?: RentFrequency;
    deposit?: number | null;
    currency?: string;
    userId?: string;
  }): Promise<Lease | null> {
    const existingDraft = await this.leases.findOne({
      where: { unitId: params.unitId, status: LeaseStatus.DRAFT },
      order: { createdAt: 'DESC' },
    });
    const existingActive = await this.leases.findOne({
      where: { unitId: params.unitId, status: LeaseStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });

    let targetLease: Lease | null = existingDraft;

    const rentMinor =
      params.rentAmount != null && params.rentAmount > 0
        ? Math.round(params.rentAmount * 100).toString()
        : null;

    if (existingDraft) {
      if (rentMinor) existingDraft.rentAmountMinor = rentMinor;
      if (params.startDate) existingDraft.startDate = params.startDate;
      if (params.frequency) existingDraft.frequency = params.frequency;
      if (params.deposit != null) {
        existingDraft.depositMinor = Math.round(
          params.deposit * 100,
        ).toString();
      }
      if (params.currency) existingDraft.currency = params.currency;
      targetLease = await this.leases.save(existingDraft);
    } else if (!existingActive && (rentMinor || params.tenantId)) {
      const reference = `LSE-${Date.now().toString(36).toUpperCase()}`;
      targetLease = await this.leases.save(
        this.leases.create({
          unitId: params.unitId,
          reference,
          startDate: params.startDate ?? new Date().toISOString().slice(0, 10),
          rentAmountMinor: rentMinor ?? '0',
          currency: params.currency ?? 'USD',
          frequency: params.frequency ?? RentFrequency.MONTHLY,
          rentDueDay: 1,
          depositMinor: params.deposit
            ? Math.round(params.deposit * 100).toString()
            : '0',
          status: LeaseStatus.DRAFT,
          createdByUserId: params.userId ?? null,
        }),
      );
    }

    if (targetLease && params.tenantId) {
      let tenant = await this.tenants.findOne({
        where: { id: params.tenantId },
      });
      if (!tenant) {
        tenant = await this.tenants.findOne({
          where: { userId: params.tenantId },
        });
      }
      if (tenant) {
        const existingLt = await this.leaseTenants.findOne({
          where: { leaseId: targetLease.id, tenantId: tenant.id },
        });
        if (!existingLt) {
          await this.leaseTenants.save(
            this.leaseTenants.create({
              leaseId: targetLease.id,
              tenantId: tenant.id,
              isPrimary: true,
            }),
          );
        }
      }
    }

    return targetLease;
  }

  async updateUnit(
    user: AuthJwtPayload,
    unitId: string,
    dto: UpdateUnitDto,
  ): Promise<Unit> {
    const unit = await this.units.findOne({ where: { id: unitId } });
    if (!unit) throw new NotFoundException('Unit not found');
    await this.findManageable(user, unit.propertyId);
    const prevStatus = unit.status;

    if (dto.tenantId !== undefined) {
      if (dto.tenantId) {
        let tenantUser = await this.users.findOne({
          where: { id: dto.tenantId },
        });
        if (!tenantUser) {
          const tenantRecord = await this.tenants.findOne({
            where: { id: dto.tenantId },
          });
          if (tenantRecord?.userId) {
            tenantUser = await this.users.findOne({
              where: { id: tenantRecord.userId },
            });
          }
        }
        if (tenantUser && tenantUser.role !== UserRole.TENANT) {
          throw new ForbiddenException('That user is not a tenant');
        }
      }
      unit.tenantId = dto.tenantId;
      unit.status = dto.tenantId ? UnitStatus.OCCUPIED : UnitStatus.VACANT;
    }

    Object.assign(unit, {
      ...dto,
      ...(dto.rent !== undefined ? { rent: String(dto.rent) } : {}),
    });
    const saved = await this.units.save(unit);

    if (dto.rent !== undefined || dto.tenantId !== undefined) {
      const rentToUse =
        dto.rent !== undefined
          ? dto.rent
          : unit.rent
            ? Number(unit.rent)
            : undefined;
      await this.syncDraftLease({
        unitId: unit.id,
        tenantId: unit.tenantId,
        rentAmount: rentToUse,
        startDate: dto.startDate,
        frequency: dto.frequency,
        deposit: dto.deposit,
        currency: dto.currency,
        userId: user.id,
      });
    }

    // Sync subscriptions if occupancy status may have changed
    if (saved.status !== prevStatus) {
      const property = await this.properties.findOne({
        where: { id: saved.propertyId },
      });
      if (property) {
        await this.subscriptions.syncManagedUnitsForOwner(property.ownerId);
      }
    }
    return this.findUnit(user, unit.id);
  }

  /** Move a tenant into a unit, or (with tenantId: null) out of it. */
  async assignTenant(
    user: AuthJwtPayload,
    unitId: string,
    dto: AssignTenantDto,
  ): Promise<Unit> {
    const unit = await this.units.findOne({ where: { id: unitId } });
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }
    const property = await this.findManageable(user, unit.propertyId);

    if (dto.tenantId) {
      let tenantUser = await this.users.findOne({
        where: { id: dto.tenantId },
      });
      if (!tenantUser) {
        const tenantRecord = await this.tenants.findOne({
          where: { id: dto.tenantId },
        });
        if (tenantRecord?.userId) {
          tenantUser = await this.users.findOne({
            where: { id: tenantRecord.userId },
          });
        }
      }
      if (tenantUser && tenantUser.role !== UserRole.TENANT) {
        throw new ForbiddenException('That user is not a tenant');
      }
    }

    unit.tenantId = dto.tenantId ?? null;
    unit.status = dto.tenantId ? UnitStatus.OCCUPIED : UnitStatus.VACANT;
    if (dto.rent !== undefined) {
      unit.rent = String(dto.rent);
    }
    const saved = await this.units.save(unit);

    const rentToUse =
      dto.rent !== undefined
        ? dto.rent
        : unit.rent
          ? Number(unit.rent)
          : undefined;

    await this.syncDraftLease({
      unitId: unit.id,
      tenantId: dto.tenantId,
      rentAmount: rentToUse,
      startDate: dto.startDate,
      frequency: dto.frequency,
      deposit: dto.deposit,
      currency: dto.currency,
      userId: user.id,
    });

    await this.subscriptions.syncManagedUnitsForOwner(property.ownerId);
    return this.findUnit(user, unit.id);
  }

  // ── Access rules ──────────────────────────────────────────────

  private async canView(
    user: AuthJwtPayload,
    property: Property,
  ): Promise<boolean> {
    if (seesEverything(user) || property.ownerId === user.id) {
      return true;
    }
    // Anyone else needs a tenancy in the property to see it at all.
    return (
      (await this.units.countBy({
        propertyId: property.id,
        tenantId: user.id,
      })) > 0
    );
  }

  /** Read + write gate: owning the property, or being an admin. */
  private async findManageable(
    user: AuthJwtPayload,
    id: string,
  ): Promise<Property> {
    const property = await this.properties.findOne({ where: { id } });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (seesEverything(user)) {
      return property;
    }
    if (property.ownerId !== user.id) {
      // Tenants get 404 rather than 403 for properties they can only read,
      // so the response never confirms a property they don't manage exists.
      throw new NotFoundException('Property not found');
    }
    return property;
  }
}
