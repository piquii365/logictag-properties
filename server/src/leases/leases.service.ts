import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { Lease } from './entities/lease.entity';
import { LeaseTenant } from './entities/lease-tenant.entity';
import { LeaseDocument } from './entities/lease-document.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Unit } from '../properties/entities/unit.entity';
import { Property } from '../properties/entities/property.entity';
import { UserRole } from '../auth/enums/role.enum';
import { LeaseStatus, RentFrequency } from '../common/enums/leasing.enum';
import { ChargeStatus } from '../common/enums/billing.enum';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { UpdateLeaseDto } from './dto/update-lease.dto';
import { AddLeaseTenantDto } from './dto/add-lease-tenant.dto';
import { OWNER_ROLES, seesEverything } from '../common/access';
import { NotificationsService } from '../notifications/notifications.service';
import { RentCharge } from '../billing/entities/rent-charge.entity';

const isBackOffice = (user: AuthJwtPayload) =>
  seesEverything(user) || user.role === UserRole.STAFF;

/** Format a Date to YYYY-MM-DD string. */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Calculate period end date (inclusive) based on start date and frequency. */
function calcPeriodEnd(start: Date, frequency: RentFrequency): Date {
  const d = new Date(start);
  switch (frequency) {
    case RentFrequency.WEEKLY:
      d.setDate(d.getDate() + 7 - 1);
      break;
    case RentFrequency.QUARTERLY:
      d.setMonth(d.getMonth() + 3);
      d.setDate(d.getDate() - 1);
      break;
    case RentFrequency.ANNUALLY:
      d.setFullYear(d.getFullYear() + 1);
      d.setDate(d.getDate() - 1);
      break;
    case RentFrequency.MONTHLY:
    default:
      d.setMonth(d.getMonth() + 1);
      d.setDate(d.getDate() - 1);
      break;
  }
  return d;
}


@Injectable()
export class LeasesService {
  private leases: Repository<Lease>;
  private leaseTenants: Repository<LeaseTenant>;
  private leaseDocuments: Repository<LeaseDocument>;
  private tenants: Repository<Tenant>;
  private units: Repository<Unit>;
  private rentCharges: Repository<RentCharge>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
  ) {
    this.leases = dataSource.getRepository(Lease);
    this.leaseTenants = dataSource.getRepository(LeaseTenant);
    this.leaseDocuments = dataSource.getRepository(LeaseDocument);
    this.tenants = dataSource.getRepository(Tenant);
    this.units = dataSource.getRepository(Unit);
    this.rentCharges = dataSource.getRepository(RentCharge);
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
    const { tenantId, ...leaseData } = dto;
    const reference =
      dto.reference?.trim() || `LSE-${Date.now().toString(36).toUpperCase()}`;

    const lease = await this.leases.save(
      this.leases.create({
        ...leaseData,
        reference,
        status: LeaseStatus.DRAFT,
        createdByUserId: user.id,
      }),
    );

    let linkedTenant: Tenant | null = null;
    if (tenantId) {
      let tenant = await this.tenants.findOne({ where: { id: tenantId } });
      if (!tenant) {
        tenant = await this.tenants.findOne({ where: { userId: tenantId } });
      }
      if (tenant) {
        linkedTenant = tenant;
        await this.leaseTenants.save(
          this.leaseTenants.create({
            leaseId: lease.id,
            tenantId: tenant.id,
            isPrimary: true,
          }),
        );
      }
    }

    // Notify linked tenant that a draft has been created for them
    if (linkedTenant?.userId) {
      await this.notifications.createSystemNotification({
        userId: linkedTenant.userId,
        eventType: 'lease_drafted',
        subject: 'Your lease agreement is being prepared',
        body: `A draft lease (Ref: ${lease.reference}) has been created for your unit. Your landlord will activate it shortly.`,
        entityType: 'lease',
        entityId: lease.id,
      });
    }

    return lease;
  }

  async update(
    user: AuthJwtPayload,
    id: string,
    dto: UpdateLeaseDto,
  ): Promise<Lease> {
    const lease = await this.findManageable(user, id);
    const wasActive = lease.status === LeaseStatus.ACTIVE;

    if (
      dto.status === LeaseStatus.ACTIVE &&
      lease.status !== LeaseStatus.ACTIVE
    ) {
      lease.activatedAt = new Date();
    } else if (
      dto.status === LeaseStatus.TERMINATED &&
      lease.status !== LeaseStatus.TERMINATED
    ) {
      lease.terminatedAt = new Date();
    }
    Object.assign(lease, dto);
    const saved = await this.leases.save(lease);

    // Notify tenants of changes
    const tenantUserIds = await this.getTenantUserIds(id);
    if (dto.status === LeaseStatus.ACTIVE && !wasActive) {
      // Becoming active — issue first rent charge
      await this.issueFirstRentCharge(saved, user.id);
      for (const userId of tenantUserIds) {
        await this.notifications.createSystemNotification({
          userId,
          eventType: 'lease_activated',
          subject: 'Your lease is now active',
          body: `Your lease (Ref: ${saved.reference}) has been activated. Your first rent of ${this.fmtMoney(saved.rentAmountMinor, saved.currency)} is due on ${saved.startDate}.`,
          entityType: 'lease',
          entityId: saved.id,
        });
      }
    } else if (dto.status === LeaseStatus.TERMINATED) {
      for (const userId of tenantUserIds) {
        await this.notifications.createSystemNotification({
          userId,
          eventType: 'lease_terminated',
          subject: 'Your lease has been terminated',
          body: `Your lease (Ref: ${saved.reference}) has been terminated.${dto.terminationReason ? ` Reason: ${dto.terminationReason}` : ''}`,
          entityType: 'lease',
          entityId: saved.id,
        });
      }
    } else if (tenantUserIds.length > 0) {
      for (const userId of tenantUserIds) {
        await this.notifications.createSystemNotification({
          userId,
          eventType: 'lease_updated',
          subject: 'Your lease terms have been updated',
          body: `Your lease (Ref: ${saved.reference}) has been updated. Please review the new terms in the app.`,
          entityType: 'lease',
          entityId: saved.id,
        });
      }
    }

    return saved;
  }

  async activate(user: AuthJwtPayload, id: string): Promise<Lease> {
    const lease = await this.findManageable(user, id);
    if (lease.status === LeaseStatus.ACTIVE) return lease;

    lease.status = LeaseStatus.ACTIVE;
    lease.activatedAt = new Date();
    const saved = await this.leases.save(lease);

    // Auto-issue the first rent charge
    await this.issueFirstRentCharge(saved, user.id);

    // Notify tenants
    const tenantUserIds = await this.getTenantUserIds(id);
    for (const userId of tenantUserIds) {
      await this.notifications.createSystemNotification({
        userId,
        eventType: 'lease_activated',
        subject: 'Your lease is now active',
        body: `Your lease (Ref: ${saved.reference}) has been activated. Your first rent of ${this.fmtMoney(saved.rentAmountMinor, saved.currency)} is due on ${saved.startDate}.`,
        entityType: 'lease',
        entityId: saved.id,
      });
    }

    return saved;
  }

  async terminate(
    user: AuthJwtPayload,
    id: string,
    reason?: string,
  ): Promise<Lease> {
    const lease = await this.findManageable(user, id);
    lease.status = LeaseStatus.TERMINATED;
    lease.terminatedAt = new Date();
    lease.terminationReason = reason ?? null;
    const saved = await this.leases.save(lease);

    // Notify tenants
    const tenantUserIds = await this.getTenantUserIds(id);
    for (const userId of tenantUserIds) {
      await this.notifications.createSystemNotification({
        userId,
        eventType: 'lease_terminated',
        subject: 'Your lease has been terminated',
        body: `Your lease (Ref: ${saved.reference}) has been terminated.${reason ? ` Reason: ${reason}` : ''} Please contact your landlord for further information.`,
        entityType: 'lease',
        entityId: saved.id,
      });
    }

    return saved;
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
    let tenant = await this.tenants.findOne({ where: { id: dto.tenantId } });
    if (!tenant) {
      tenant = await this.tenants.findOne({ where: { userId: dto.tenantId } });
    }
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return this.leaseTenants.save(
      this.leaseTenants.create({
        leaseId,
        tenantId: tenant.id,
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

  // ── Rent charge helpers ───────────────────────────────────────

  /** Create the first (advance) rent charge if one doesn't already exist. */
  private async issueFirstRentCharge(
    lease: Lease,
    createdByUserId: string,
  ): Promise<void> {
    const existing = await this.rentCharges.findOne({
      where: { leaseId: lease.id },
    });
    if (existing) return; // already issued

    const periodStart = new Date(lease.startDate);
    const periodEnd = calcPeriodEnd(
      periodStart,
      lease.frequency as RentFrequency,
    );

    await this.rentCharges.save(
      this.rentCharges.create({
        leaseId: lease.id,
        periodStart: toDateStr(periodStart),
        periodEnd: toDateStr(periodEnd),
        dueDate: lease.startDate,
        amountMinor: lease.rentAmountMinor,
        currency: lease.currency,
        status: ChargeStatus.OUTSTANDING,
        allocatedMinor: '0',
        createdByUserId,
      }),
    );
  }

  /** Format minor units to a human-readable money string. */
  private fmtMoney(minor: string, currency: string): string {
    return `${currency} ${(Number(minor) / 100).toFixed(2)}`;
  }

  /** Collect the user IDs of all tenants linked to a lease. */
  private async getTenantUserIds(leaseId: string): Promise<string[]> {
    const lts = await this.leaseTenants.find({ where: { leaseId } });
    if (lts.length === 0) return [];
    const tenantIds = lts.map((lt) => lt.tenantId);
    const tenants = await this.tenants.findBy({ id: In(tenantIds) });
    return tenants
      .filter((t) => t.userId != null)
      .map((t) => t.userId as string);
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
