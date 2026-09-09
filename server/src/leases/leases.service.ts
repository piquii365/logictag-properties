import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Lease } from './entities/lease.entity';
import { LeaseTenant } from './entities/lease-tenant.entity';
import { LeaseDocument } from './entities/lease-document.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Unit } from '../properties/entities/unit.entity';
import { Property } from '../properties/entities/property.entity';
import { UserRole } from '../auth/enums/role.enum';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { UpdateLeaseDto } from './dto/update-lease.dto';
import { AddLeaseTenantDto } from './dto/add-lease-tenant.dto';
import { OWNER_ROLES, seesEverything } from '../common/access';

const isBackOffice = (user: AuthJwtPayload) =>
  seesEverything(user) || user.role === UserRole.STAFF;

@Injectable()
export class LeasesService {
  private leases: Repository<Lease>;
  private leaseTenants: Repository<LeaseTenant>;
  private leaseDocuments: Repository<LeaseDocument>;
  private tenants: Repository<Tenant>;
  private units: Repository<Unit>;

  constructor(private readonly dataSource: DataSource) {
    this.leases = dataSource.getRepository(Lease);
    this.leaseTenants = dataSource.getRepository(LeaseTenant);
    this.leaseDocuments = dataSource.getRepository(LeaseDocument);
    this.tenants = dataSource.getRepository(Tenant);
    this.units = dataSource.getRepository(Unit);
  }

  async findAll(user: AuthJwtPayload): Promise<Lease[]> {
    if (isBackOffice(user)) {
      return this.leases.find({ order: { createdAt: 'DESC' } });
    }
    if (OWNER_ROLES.includes(user.role)) {
      return this.scopedToOwner(user.id).getMany();
    }
    if (user.role === UserRole.TENANT) {
      return this.scopedToTenant(user.id).getMany();
    }
    throw new ForbiddenException('Not allowed to view leases');
  }

  async findOne(user: AuthJwtPayload, id: string): Promise<Lease> {
    const lease = await this.leases.findOne({ where: { id } });
    if (!lease || !(await this.canView(user, lease))) {
      throw new NotFoundException('Lease not found');
    }
    return lease;
  }

  async create(user: AuthJwtPayload, dto: CreateLeaseDto): Promise<Lease> {
    this.assertManages(user);
    const unit = await this.units.findOne({ where: { id: dto.unitId } });
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }
    if (OWNER_ROLES.includes(user.role) && unit.propertyId) {
      await this.assertOwnsUnit(user.id, unit.id);
    }
    return this.leases.save(
      this.leases.create({ ...dto, createdByUserId: user.id }),
    );
  }

  async update(
    user: AuthJwtPayload,
    id: string,
    dto: UpdateLeaseDto,
  ): Promise<Lease> {
    const lease = await this.findManageable(user, id);
    Object.assign(lease, dto);
    return this.leases.save(lease);
  }

  // ── Lease tenants ─────────────────────────────────────────────

  async listTenants(user: AuthJwtPayload, leaseId: string) {
    await this.findOne(user, leaseId);
    return this.leaseTenants.find({ where: { leaseId } });
  }

  async addTenant(
    user: AuthJwtPayload,
    leaseId: string,
    dto: AddLeaseTenantDto,
  ): Promise<LeaseTenant> {
    await this.findManageable(user, leaseId);
    const tenant = await this.tenants.findOne({ where: { id: dto.tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return this.leaseTenants.save(
      this.leaseTenants.create({
        leaseId,
        tenantId: dto.tenantId,
        isPrimary: dto.isPrimary ?? false,
      }),
    );
  }

  async removeTenant(
    user: AuthJwtPayload,
    leaseId: string,
    tenantId: string,
  ): Promise<{ id: string }> {
    await this.findManageable(user, leaseId);
    await this.leaseTenants.delete({ leaseId, tenantId });
    return { id: tenantId };
  }

  // ── Lease documents ───────────────────────────────────────────

  async listDocuments(user: AuthJwtPayload, leaseId: string) {
    await this.findOne(user, leaseId);
    return this.leaseDocuments.find({
      where: { leaseId },
      order: { createdAt: 'DESC' },
    });
  }

  async addDocument(
    user: AuthJwtPayload,
    leaseId: string,
    type: string,
    file: Express.Multer.File,
  ): Promise<LeaseDocument> {
    await this.findManageable(user, leaseId);
    return this.leaseDocuments.save(
      this.leaseDocuments.create({
        leaseId,
        disk: 'local',
        path: file.path,
        originalName: file.originalname,
        mime: file.mimetype,
        sizeBytes: String(file.size),
        type,
        uploadedByUserId: user.id,
      }),
    );
  }

  // ── Access rules ──────────────────────────────────────────────

  private async canView(user: AuthJwtPayload, lease: Lease): Promise<boolean> {
    if (isBackOffice(user)) {
      return true;
    }
    if (OWNER_ROLES.includes(user.role)) {
      return (
        (await this.scopedToOwner(user.id)
          .andWhere('lease.id = :id', { id: lease.id })
          .getCount()) > 0
      );
    }
    if (user.role === UserRole.TENANT) {
      return (
        (await this.scopedToTenant(user.id)
          .andWhere('lease.id = :id', { id: lease.id })
          .getCount()) > 0
      );
    }
    return false;
  }

  private async findManageable(
    user: AuthJwtPayload,
    id: string,
  ): Promise<Lease> {
    const lease = await this.leases.findOne({ where: { id } });
    if (!lease) {
      throw new NotFoundException('Lease not found');
    }
    if (isBackOffice(user)) {
      return lease;
    }
    if (
      OWNER_ROLES.includes(user.role) &&
      (await this.scopedToOwner(user.id)
        .andWhere('lease.id = :id', { id: lease.id })
        .getCount()) > 0
    ) {
      return lease;
    }
    throw new NotFoundException('Lease not found');
  }

  private assertManages(user: AuthJwtPayload) {
    if (!isBackOffice(user) && !OWNER_ROLES.includes(user.role)) {
      throw new ForbiddenException('Not allowed to manage leases');
    }
  }

  private async assertOwnsUnit(ownerId: string, unitId: string) {
    const count = await this.units
      .createQueryBuilder('unit')
      .innerJoin(
        Property,
        'property',
        'property.id = unit.property_id AND property.owner_id = :ownerId',
        { ownerId },
      )
      .andWhere('unit.id = :unitId', { unitId })
      .getCount();
    if (count === 0) {
      throw new ForbiddenException('You do not manage this unit');
    }
  }

  private scopedToOwner(ownerId: string) {
    return this.leases
      .createQueryBuilder('lease')
      .innerJoin(Unit, 'unit', 'unit.id = lease.unit_id')
      .innerJoin(
        Property,
        'property',
        'property.id = unit.property_id AND property.owner_id = :ownerId',
        { ownerId },
      );
  }

  private scopedToTenant(userId: string) {
    return this.leases
      .createQueryBuilder('lease')
      .innerJoin(LeaseTenant, 'lt', 'lt.lease_id = lease.id')
      .innerJoin(
        Tenant,
        'tenant',
        'tenant.id = lt.tenant_id AND tenant.user_id = :userId',
        { userId },
      )
      .distinct(true);
  }
}
