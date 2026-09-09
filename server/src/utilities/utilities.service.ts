import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Utility } from './entities/utility.entity';
import { UtilityRate } from './entities/utility-rate.entity';
import { Meter } from './entities/meter.entity';
import { MeterReading } from './entities/meter-reading.entity';
import { UtilityCharge } from './entities/utility-charge.entity';
import { Property } from '../properties/entities/property.entity';
import { Unit } from '../properties/entities/unit.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Lease } from '../leases/entities/lease.entity';
import { UserRole } from '../auth/enums/role.enum';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { CreateUtilityDto } from './dto/create-utility.dto';
import { CreateUtilityRateDto } from './dto/create-utility-rate.dto';
import { CreateMeterDto } from './dto/create-meter.dto';
import { CreateMeterReadingDto } from './dto/create-meter-reading.dto';
import { CreateUtilityChargeDto } from './dto/create-utility-charge.dto';
import {
  OWNER_ROLES,
  seesEverything,
  unitBelongsToOwner,
} from '../common/access';

const isBackOffice = (user: AuthJwtPayload) =>
  seesEverything(user) || user.role === UserRole.STAFF;

@Injectable()
export class UtilitiesService {
  private utilities: Repository<Utility>;
  private rates: Repository<UtilityRate>;
  private meters: Repository<Meter>;
  private readings: Repository<MeterReading>;
  private charges: Repository<UtilityCharge>;
  private units: Repository<Unit>;
  private tenants: Repository<Tenant>;
  private leases: Repository<Lease>;

  constructor(private readonly dataSource: DataSource) {
    this.utilities = dataSource.getRepository(Utility);
    this.rates = dataSource.getRepository(UtilityRate);
    this.meters = dataSource.getRepository(Meter);
    this.readings = dataSource.getRepository(MeterReading);
    this.charges = dataSource.getRepository(UtilityCharge);
    this.units = dataSource.getRepository(Unit);
    this.tenants = dataSource.getRepository(Tenant);
    this.leases = dataSource.getRepository(Lease);
  }

  // ── Utilities ─────────────────────────────────────────────────

  async findAll(user: AuthJwtPayload): Promise<Utility[]> {
    if (isBackOffice(user)) {
      return this.utilities.find({ order: { name: 'ASC' } });
    }
    if (OWNER_ROLES.includes(user.role)) {
      return this.utilities
        .createQueryBuilder('utility')
        .innerJoin(
          Property,
          'property',
          'property.id = utility.property_id AND property.owner_id = :ownerId',
          { ownerId: user.id },
        )
        .getMany();
    }
    throw new ForbiddenException('Not allowed to view utilities');
  }

  async findOne(user: AuthJwtPayload, id: string): Promise<Utility> {
    const utility = await this.utilities.findOne({ where: { id } });
    if (!utility) {
      throw new NotFoundException('Utility not found');
    }
    if (isBackOffice(user)) return utility;
    if (
      OWNER_ROLES.includes(user.role) &&
      (await this.propertyBelongsToOwner(user.id, utility.propertyId))
    ) {
      return utility;
    }
    throw new NotFoundException('Utility not found');
  }

  async create(user: AuthJwtPayload, dto: CreateUtilityDto): Promise<Utility> {
    if (!isBackOffice(user) && !OWNER_ROLES.includes(user.role)) {
      throw new ForbiddenException('Not allowed to manage utilities');
    }
    if (
      OWNER_ROLES.includes(user.role) &&
      !(await this.propertyBelongsToOwner(user.id, dto.propertyId))
    ) {
      throw new ForbiddenException('You do not manage this property');
    }
    return this.utilities.save(this.utilities.create(dto));
  }

  // ── Rates ─────────────────────────────────────────────────────

  async listRates(
    user: AuthJwtPayload,
    utilityId: string,
  ): Promise<UtilityRate[]> {
    await this.findOne(user, utilityId);
    return this.rates.find({
      where: { utilityId },
      order: { effectiveFrom: 'DESC' },
    });
  }

  async addRate(
    user: AuthJwtPayload,
    utilityId: string,
    dto: CreateUtilityRateDto,
  ): Promise<UtilityRate> {
    await this.findOne(user, utilityId);
    if (!isBackOffice(user) && !OWNER_ROLES.includes(user.role)) {
      throw new ForbiddenException('Not allowed to manage utility rates');
    }
    return this.rates.save(
      this.rates.create({ ...dto, utilityId, createdByUserId: user.id }),
    );
  }

  // ── Meters ────────────────────────────────────────────────────

  async listMeters(user: AuthJwtPayload): Promise<Meter[]> {
    if (isBackOffice(user)) {
      return this.meters.find();
    }
    if (OWNER_ROLES.includes(user.role)) {
      return this.meters
        .createQueryBuilder('meter')
        .innerJoin(Unit, 'unit', 'unit.id = meter.unit_id')
        .innerJoin(
          Property,
          'property',
          'property.id = unit.property_id AND property.owner_id = :ownerId',
          { ownerId: user.id },
        )
        .getMany();
    }
    throw new ForbiddenException('Not allowed to view meters');
  }

  async createMeter(user: AuthJwtPayload, dto: CreateMeterDto): Promise<Meter> {
    if (!isBackOffice(user) && !OWNER_ROLES.includes(user.role)) {
      throw new ForbiddenException('Not allowed to manage meters');
    }
    if (
      OWNER_ROLES.includes(user.role) &&
      !(await unitBelongsToOwner(this.units, user.id, dto.unitId))
    ) {
      throw new ForbiddenException('You do not manage this unit');
    }
    return this.meters.save(
      this.meters.create({
        ...dto,
        multiplier:
          dto.multiplier !== undefined ? String(dto.multiplier) : undefined,
      }),
    );
  }

  // ── Meter readings ────────────────────────────────────────────

  async listReadings(
    user: AuthJwtPayload,
    meterId: string,
  ): Promise<MeterReading[]> {
    await this.assertCanAccessMeter(user, meterId);
    return this.readings.find({
      where: { meterId },
      order: { readingDate: 'DESC' },
    });
  }

  async addReading(
    user: AuthJwtPayload,
    meterId: string,
    dto: CreateMeterReadingDto,
  ): Promise<MeterReading> {
    await this.assertCanAccessMeter(user, meterId);
    const previous = await this.readings.findOne({
      where: { meterId },
      order: { readingDate: 'DESC' },
    });
    const consumption =
      previous != null ? dto.reading - Number(previous.reading) : null;
    return this.readings.save(
      this.readings.create({
        meterId,
        reading: String(dto.reading),
        readingDate: dto.readingDate,
        previousReadingId: previous?.id ?? null,
        consumption: consumption != null ? String(consumption) : null,
        isEstimated: dto.isEstimated ?? false,
        overrideReason: dto.overrideReason ?? null,
        recordedByUserId: user.id,
      }),
    );
  }

  // ── Utility charges ───────────────────────────────────────────

  async findAllCharges(user: AuthJwtPayload): Promise<UtilityCharge[]> {
    if (isBackOffice(user)) {
      return this.charges.find({ order: { dueDate: 'DESC' } });
    }
    if (OWNER_ROLES.includes(user.role)) {
      return this.scopedChargesToOwner(user.id).getMany();
    }
    if (user.role === UserRole.TENANT) {
      return this.scopedChargesToTenant(user.id).getMany();
    }
    throw new ForbiddenException('Not allowed to view utility charges');
  }

  async findOneCharge(
    user: AuthJwtPayload,
    id: string,
  ): Promise<UtilityCharge> {
    const charge = await this.charges.findOne({ where: { id } });
    if (!charge) {
      throw new NotFoundException('Utility charge not found');
    }
    if (isBackOffice(user)) return charge;
    if (OWNER_ROLES.includes(user.role)) {
      const count = await this.scopedChargesToOwner(user.id)
        .andWhere('charge.id = :id', { id })
        .getCount();
      if (count > 0) return charge;
    }
    if (user.role === UserRole.TENANT) {
      const count = await this.scopedChargesToTenant(user.id)
        .andWhere('charge.id = :id', { id })
        .getCount();
      if (count > 0) return charge;
    }
    throw new NotFoundException('Utility charge not found');
  }

  async createCharge(
    user: AuthJwtPayload,
    dto: CreateUtilityChargeDto,
  ): Promise<UtilityCharge> {
    if (!isBackOffice(user) && !OWNER_ROLES.includes(user.role)) {
      throw new ForbiddenException('Not allowed to manage utility charges');
    }
    if (
      OWNER_ROLES.includes(user.role) &&
      !(await unitBelongsToOwner(this.units, user.id, dto.unitId))
    ) {
      throw new ForbiddenException('You do not manage this unit');
    }
    // Validate foreign keys up front to avoid 500 FK violations
    const [unit, utility, tenantById] = await Promise.all([
      this.units.findOne({ where: { id: dto.unitId } }),
      this.utilities.findOne({ where: { id: dto.utilityId } }),
      this.tenants.findOne({ where: { id: dto.tenantId } }),
    ]);

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }
    if (!utility) {
      throw new NotFoundException('Utility not found');
    }
    if (utility.propertyId !== unit.propertyId) {
      throw new ForbiddenException(
        "Utility does not belong to the unit's property",
      );
    }
    // Resolve tenant: accept Tenant.id or fallback to Tenant by userId, or the
    // unit's assigned user -> matching Tenant.userId.
    let resolvedTenant = tenantById ?? null;
    if (!resolvedTenant) {
      // 1) Try interpreting provided tenantId as a User.id
      const byUserId = await this.tenants.findOne({
        where: { userId: dto.tenantId },
      });
      if (byUserId) {
        resolvedTenant = byUserId;
      } else if (unit.tenantId) {
        // 2) If unit has an assigned user, map that to a Tenant record
        const unitAssigned = await this.tenants.findOne({
          where: { userId: unit.tenantId },
        });
        if (unitAssigned) {
          resolvedTenant = unitAssigned;
        }
      }
    }
    if (!resolvedTenant) {
      throw new NotFoundException(
        'Tenant not found. Pass a valid tenant CRM id or a user id linked to this unit.',
      );
    }

    let meterId: string | undefined = dto.meterId;
    if (dto.meterId) {
      const meter = await this.meters.findOne({ where: { id: dto.meterId } });
      if (!meter) {
        throw new NotFoundException('Meter not found');
      }
      if (meter.unitId !== unit.id || meter.utilityId !== utility.id) {
        throw new ForbiddenException(
          'Meter must belong to the same unit and utility',
        );
      }
      meterId = meter.id;
    }

    let leaseId: string | null | undefined = dto.leaseId;
    if (dto.leaseId) {
      const lease = await this.leases.findOne({ where: { id: dto.leaseId } });
      if (!lease) {
        throw new NotFoundException('Lease not found');
      }
      if (lease.unitId !== unit.id) {
        throw new ForbiddenException('Lease does not belong to this unit');
      }
      leaseId = lease.id;
    }

    return this.charges.save(
      this.charges.create({
        ...dto,
        tenantId: resolvedTenant.id,
        meterId,
        leaseId: leaseId ?? null,
        createdByUserId: user.id,
      }),
    );
  }

  // ── Access rules ──────────────────────────────────────────────

  private async propertyBelongsToOwner(ownerId: string, propertyId: string) {
    const count = await this.utilities.manager
      .getRepository(Property)
      .countBy({ id: propertyId, ownerId });
    return count > 0;
  }

  private async assertCanAccessMeter(user: AuthJwtPayload, meterId: string) {
    const meter = await this.meters.findOne({ where: { id: meterId } });
    if (!meter) {
      throw new NotFoundException('Meter not found');
    }
    if (isBackOffice(user)) return;
    if (
      OWNER_ROLES.includes(user.role) &&
      (await unitBelongsToOwner(this.units, user.id, meter.unitId))
    ) {
      return;
    }
    throw new ForbiddenException('Not allowed to access this meter');
  }

  private scopedChargesToOwner(ownerId: string) {
    return this.charges
      .createQueryBuilder('charge')
      .innerJoin(Unit, 'unit', 'unit.id = charge.unit_id')
      .innerJoin(
        Property,
        'property',
        'property.id = unit.property_id AND property.owner_id = :ownerId',
        { ownerId },
      );
  }

  private scopedChargesToTenant(userId: string) {
    return this.charges
      .createQueryBuilder('charge')
      .innerJoin(
        Tenant,
        'tenant',
        'tenant.id = charge.tenant_id AND tenant.user_id = :userId',
        { userId },
      );
  }
}
