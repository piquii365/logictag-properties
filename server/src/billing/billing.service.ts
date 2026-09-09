import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { RentCharge } from './entities/rent-charge.entity';
import { ChargeAdjustment } from './entities/charge-adjustment.entity';
import {
  RentSchedule,
  RentScheduleStatus,
} from './entities/rent-schedule.entity';
import { Lease } from '../leases/entities/lease.entity';
import { LeaseTenant } from '../leases/entities/lease-tenant.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Unit } from '../properties/entities/unit.entity';
import { Property } from '../properties/entities/property.entity';
import { UserRole } from '../auth/enums/role.enum';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { CreateRentChargeDto } from './dto/create-rent-charge.dto';
import { CreateChargeAdjustmentDto } from './dto/create-charge-adjustment.dto';
import { CreateRentScheduleDto } from './dto/create-rent-schedule.dto';
import { OWNER_ROLES, seesEverything } from '../common/access';
import { ChargeStatus } from '../common/enums/billing.enum';

const isBackOffice = (user: AuthJwtPayload) =>
  seesEverything(user) || user.role === UserRole.STAFF;

@Injectable()
export class BillingService {
  private rentCharges: Repository<RentCharge>;
  private adjustments: Repository<ChargeAdjustment>;
  private leases: Repository<Lease>;
  private schedules: Repository<RentSchedule>;

  constructor(private readonly dataSource: DataSource) {
    this.rentCharges = dataSource.getRepository(RentCharge);
    this.adjustments = dataSource.getRepository(ChargeAdjustment);
    this.leases = dataSource.getRepository(Lease);
    this.schedules = dataSource.getRepository(RentSchedule);
  }

  async createSchedule(
    user: AuthJwtPayload,
    dto: CreateRentScheduleDto,
  ): Promise<RentSchedule> {
    this.assertManages(user);
    const lease = await this.leases.findOne({ where: { id: dto.leaseId } });
    if (!lease) {
      throw new NotFoundException('Lease not found');
    }
    if (OWNER_ROLES.includes(user.role)) {
      await this.assertOwnsLease(user.id, lease.id);
    }

    const schedule = this.schedules.create({
      leaseId: dto.leaseId,
      startDate: dto.startDate,
      endDate: dto.endDate ?? null,
      dueDay: dto.dueDay ?? lease.rentDueDay ?? 1,
      rentAmountMinor: dto.rentAmountMinor,
      currency: dto.currency ?? lease.currency ?? 'USD',
      frequency: dto.frequency ?? 'monthly',
      status: RentScheduleStatus.ACTIVE,
      createdByUserId: user.id,
    });

    return this.schedules.save(schedule);
  }

  async listSchedules(
    user: AuthJwtPayload,
    leaseId: string,
  ): Promise<RentSchedule[]> {
    await this.findLeaseForView(user, leaseId);
    return this.schedules.find({
      where: { leaseId },
      order: { startDate: 'DESC' },
    });
  }

  async generateChargesForLease(
    user: AuthJwtPayload,
    leaseId: string,
    startDate: string,
    endDate: string,
  ): Promise<RentCharge[]> {
    const lease = await this.findLeaseForView(user, leaseId);
    const schedule = await this.schedules.findOne({
      where: { leaseId, status: RentScheduleStatus.ACTIVE },
      order: { startDate: 'DESC' },
    });

    if (!schedule) {
      throw new NotFoundException(
        'No active rent schedule found for this lease',
      );
    }

    const amount = BigInt(
      schedule.rentAmountMinor || lease.rentAmountMinor || '0',
    );
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalMonths =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth()) +
      1;

    const generated: RentCharge[] = [];
    for (let i = 0; i < Math.max(totalMonths, 1); i += 1) {
      const periodStart = new Date(
        start.getFullYear(),
        start.getMonth() + i,
        1,
      );
      const periodEnd = new Date(
        periodStart.getFullYear(),
        periodStart.getMonth() + 1,
        0,
      );
      const existing = await this.rentCharges.findOne({
        where: {
          leaseId,
          periodStart: periodStart.toISOString().slice(0, 10),
          periodEnd: periodEnd.toISOString().slice(0, 10),
        },
      });
      if (existing) {
        generated.push(existing);
        continue;
      }
      const dueDay = Math.min(
        schedule.dueDay || lease.rentDueDay || 1,
        periodEnd.getDate(),
      );
      const dueDate = new Date(
        periodEnd.getFullYear(),
        periodEnd.getMonth(),
        dueDay,
      );

      const charge = this.rentCharges.create({
        leaseId,
        periodStart: periodStart.toISOString().slice(0, 10),
        periodEnd: periodEnd.toISOString().slice(0, 10),
        dueDate: dueDate.toISOString().slice(0, 10),
        amountMinor: amount.toString(),
        currency: schedule.currency || lease.currency || 'USD',
        status: ChargeStatus.OUTSTANDING,
        allocatedMinor: '0',
        createdByUserId: user.id,
      });

      generated.push(await this.rentCharges.save(charge));
    }

    return generated;
  }

  async findAll(user: AuthJwtPayload): Promise<RentCharge[]> {
    if (isBackOffice(user)) {
      return this.rentCharges.find({ order: { dueDate: 'DESC' } });
    }
    if (OWNER_ROLES.includes(user.role)) {
      return this.scopedToOwner(user.id).getMany();
    }
    if (user.role === UserRole.TENANT) {
      return this.scopedToTenant(user.id).getMany();
    }
    throw new ForbiddenException('Not allowed to view rent charges');
  }

  async findOne(user: AuthJwtPayload, id: string): Promise<RentCharge> {
    const charge = await this.rentCharges.findOne({ where: { id } });
    if (!charge || !(await this.canView(user, charge))) {
      throw new NotFoundException('Rent charge not found');
    }
    return charge;
  }

  async create(
    user: AuthJwtPayload,
    dto: CreateRentChargeDto,
  ): Promise<RentCharge> {
    this.assertManages(user);
    const lease = await this.leases.findOne({ where: { id: dto.leaseId } });
    if (!lease) {
      throw new NotFoundException('Lease not found');
    }
    if (OWNER_ROLES.includes(user.role)) {
      await this.assertOwnsLease(user.id, lease.id);
    }
    return this.rentCharges.save(
      this.rentCharges.create({ ...dto, createdByUserId: user.id }),
    );
  }

  async void(
    user: AuthJwtPayload,
    id: string,
    reason: string,
  ): Promise<RentCharge> {
    const charge = await this.findManageable(user, id);
    charge.status = ChargeStatus.VOIDED;
    charge.voidedAt = new Date();
    charge.voidReason = reason;
    charge.voidedByUserId = user.id;
    return this.rentCharges.save(charge);
  }

  async listAdjustments(
    user: AuthJwtPayload,
    adjustableId: string,
  ): Promise<ChargeAdjustment[]> {
    this.assertManages(user);
    return this.adjustments.find({ where: { adjustableId } });
  }

  async createAdjustment(
    user: AuthJwtPayload,
    dto: CreateChargeAdjustmentDto,
  ): Promise<ChargeAdjustment> {
    this.assertManages(user);
    return this.adjustments.save(
      this.adjustments.create({ ...dto, createdByUserId: user.id }),
    );
  }

  private async findLeaseForView(
    user: AuthJwtPayload,
    leaseId: string,
  ): Promise<Lease> {
    const lease = await this.leases.findOne({ where: { id: leaseId } });
    if (!lease) {
      throw new NotFoundException('Lease not found');
    }
    if (!(await this.canViewLease(user, lease))) {
      throw new NotFoundException('Lease not found');
    }
    return lease;
  }

  private async canViewLease(
    user: AuthJwtPayload,
    lease: Lease,
  ): Promise<boolean> {
    if (isBackOffice(user)) {
      return true;
    }
    if (OWNER_ROLES.includes(user.role)) {
      return (
        (await this.scopedToOwner(user.id)
          .andWhere('charge.lease_id = :leaseId', { leaseId: lease.id })
          .getCount()) > 0
      );
    }
    if (user.role === UserRole.TENANT) {
      return (
        (await this.scopedToTenant(user.id)
          .andWhere('charge.lease_id = :leaseId', { leaseId: lease.id })
          .getCount()) > 0
      );
    }
    return false;
  }

  private async canView(
    user: AuthJwtPayload,
    charge: RentCharge,
  ): Promise<boolean> {
    if (isBackOffice(user)) {
      return true;
    }
    if (OWNER_ROLES.includes(user.role)) {
      return (
        (await this.scopedToOwner(user.id)
          .andWhere('charge.id = :id', { id: charge.id })
          .getCount()) > 0
      );
    }
    if (user.role === UserRole.TENANT) {
      return (
        (await this.scopedToTenant(user.id)
          .andWhere('charge.id = :id', { id: charge.id })
          .getCount()) > 0
      );
    }
    return false;
  }

  private async findManageable(
    user: AuthJwtPayload,
    id: string,
  ): Promise<RentCharge> {
    const charge = await this.rentCharges.findOne({ where: { id } });
    if (!charge) {
      throw new NotFoundException('Rent charge not found');
    }
    if (isBackOffice(user)) {
      return charge;
    }
    if (
      OWNER_ROLES.includes(user.role) &&
      (await this.scopedToOwner(user.id)
        .andWhere('charge.id = :id', { id: charge.id })
        .getCount()) > 0
    ) {
      return charge;
    }
    throw new NotFoundException('Rent charge not found');
  }

  private assertManages(user: AuthJwtPayload) {
    if (!isBackOffice(user) && !OWNER_ROLES.includes(user.role)) {
      throw new ForbiddenException('Not allowed to manage billing');
    }
  }

  private async assertOwnsLease(ownerId: string, leaseId: string) {
    const count = await this.leases
      .createQueryBuilder('lease')
      .innerJoin(Unit, 'unit', 'unit.id = lease.unit_id')
      .innerJoin(
        Property,
        'property',
        'property.id = unit.property_id AND property.owner_id = :ownerId',
        { ownerId },
      )
      .andWhere('lease.id = :leaseId', { leaseId })
      .getCount();
    if (count === 0) {
      throw new ForbiddenException('You do not manage this lease');
    }
  }

  private scopedToOwner(ownerId: string) {
    return this.rentCharges
      .createQueryBuilder('charge')
      .innerJoin(Lease, 'lease', 'lease.id = charge.lease_id')
      .innerJoin(Unit, 'unit', 'unit.id = lease.unit_id')
      .innerJoin(
        Property,
        'property',
        'property.id = unit.property_id AND property.owner_id = :ownerId',
        { ownerId },
      );
  }

  private scopedToTenant(userId: string) {
    return this.rentCharges
      .createQueryBuilder('charge')
      .innerJoin(Lease, 'lease', 'lease.id = charge.lease_id')
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
