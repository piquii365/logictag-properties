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

  constructor(
    dataSource: DataSource,
    private readonly subscriptions: SubscriptionsService,
  ) {
    this.properties = dataSource.getRepository(Property);
    this.units = dataSource.getRepository(Unit);
    this.users = dataSource.getRepository(User);
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
        relations: { tenant: true },
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

  async updateUnit(
    user: AuthJwtPayload,
    unitId: string,
    dto: UpdateUnitDto,
  ): Promise<Unit> {
    const unit = await this.units.findOne({ where: { id: unitId } });
    if (!unit) throw new NotFoundException('Unit not found');
    await this.findManageable(user, unit.propertyId);
    const prevStatus = unit.status;
    Object.assign(unit, {
      ...dto,
      ...(dto.rent !== undefined ? { rent: String(dto.rent) } : {}),
    });
    const saved = await this.units.save(unit);
    // Sync subscriptions if occupancy status may have changed
    if (saved.status !== prevStatus) {
      const property = await this.properties.findOne({
        where: { id: saved.propertyId },
      });
      if (property) {
        await this.subscriptions.syncManagedUnitsForOwner(property.ownerId);
      }
    }
    return saved;
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
      const tenant = await this.users.findOne({ where: { id: dto.tenantId } });
      if (!tenant) {
        throw new NotFoundException('Tenant not found');
      }
      if (tenant.role !== UserRole.TENANT) {
        throw new ForbiddenException('That user is not a tenant');
      }
    }

    unit.tenantId = dto.tenantId ?? null;
    unit.status = dto.tenantId ? UnitStatus.OCCUPIED : UnitStatus.VACANT;
    const saved = await this.units.save(unit);
    await this.subscriptions.syncManagedUnitsForOwner(property.ownerId);
    return saved;
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
