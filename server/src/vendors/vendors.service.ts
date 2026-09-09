import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Vendor } from './entities/vendor.entity';
import { Service } from './entities/service.entity';
import { VendorService as VendorServiceEntity } from './entities/vendor-service.entity';
import { VendorServiceArea } from './entities/vendor-service-area.entity';
import { VendorRating } from './entities/vendor-rating.entity';
import { MaintenanceJob } from '../maintenance/entities/maintenance-job.entity';
import { UserRole } from '../auth/enums/role.enum';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { RejectVendorDto } from './dto/reject-vendor.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { CreateVendorServiceDto } from './dto/create-vendor-service.dto';
import { CreateVendorServiceAreaDto } from './dto/create-vendor-service-area.dto';
import { CreateVendorRatingDto } from './dto/create-vendor-rating.dto';
import { OWNER_ROLES, seesEverything } from '../common/access';
import { JobStatus, VendorStatus } from '../common/enums/maintenance.enum';

const isBackOffice = (user: AuthJwtPayload) =>
  seesEverything(user) || user.role === UserRole.STAFF;

@Injectable()
export class VendorsService {
  private vendors: Repository<Vendor>;
  private services: Repository<Service>;
  private vendorServices: Repository<VendorServiceEntity>;
  private vendorServiceAreas: Repository<VendorServiceArea>;
  private vendorRatings: Repository<VendorRating>;
  private maintenanceJobs: Repository<MaintenanceJob>;

  constructor(private readonly dataSource: DataSource) {
    this.vendors = dataSource.getRepository(Vendor);
    this.services = dataSource.getRepository(Service);
    this.vendorServices = dataSource.getRepository(VendorServiceEntity);
    this.vendorServiceAreas = dataSource.getRepository(VendorServiceArea);
    this.vendorRatings = dataSource.getRepository(VendorRating);
    this.maintenanceJobs = dataSource.getRepository(MaintenanceJob);
  }

  // ── Vendors ───────────────────────────────────────────────────

  async findAll(user: AuthJwtPayload): Promise<Vendor[]> {
    if (isBackOffice(user)) {
      return this.vendors.find({ order: { name: 'ASC' } });
    }
    if (user.role === UserRole.VENDOR) {
      return this.vendors.find({ where: { userId: user.id } });
    }
    if (OWNER_ROLES.includes(user.role)) {
      return this.vendors.find({
        where: { status: VendorStatus.APPROVED },
        order: { name: 'ASC' },
      });
    }
    throw new ForbiddenException('Not allowed to view vendors');
  }

  async findOne(user: AuthJwtPayload, id: string): Promise<Vendor> {
    const vendor = await this.vendors.findOne({ where: { id } });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
    if (
      isBackOffice(user) ||
      (user.role === UserRole.VENDOR && vendor.userId === user.id) ||
      (OWNER_ROLES.includes(user.role) &&
        vendor.status === VendorStatus.APPROVED)
    ) {
      return vendor;
    }
    throw new NotFoundException('Vendor not found');
  }

  async create(user: AuthJwtPayload, dto: CreateVendorDto): Promise<Vendor> {
    if (user.role === UserRole.VENDOR) {
      const existing = await this.vendors.findOne({
        where: { userId: user.id },
      });
      if (existing) {
        throw new ConflictException('You already have a vendor profile');
      }
    } else if (!seesEverything(user)) {
      throw new ForbiddenException('Not allowed to create a vendor profile');
    }
    return this.vendors.save(
      this.vendors.create({
        ...dto,
        userId: user.role === UserRole.VENDOR ? user.id : null,
      }),
    );
  }

  async update(
    user: AuthJwtPayload,
    id: string,
    dto: UpdateVendorDto,
  ): Promise<Vendor> {
    const vendor = await this.findManageable(user, id);
    Object.assign(vendor, dto);
    return this.vendors.save(vendor);
  }

  async approve(user: AuthJwtPayload, id: string): Promise<Vendor> {
    this.assertAdmin(user);
    const vendor = await this.vendors.findOne({ where: { id } });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
    vendor.status = VendorStatus.APPROVED;
    vendor.approvedAt = new Date();
    vendor.approvedByUserId = user.id;
    vendor.rejectionReason = null;
    return this.vendors.save(vendor);
  }

  async reject(
    user: AuthJwtPayload,
    id: string,
    dto: RejectVendorDto,
  ): Promise<Vendor> {
    this.assertAdmin(user);
    const vendor = await this.vendors.findOne({ where: { id } });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
    vendor.status = VendorStatus.REJECTED;
    vendor.rejectionReason = dto.reason;
    return this.vendors.save(vendor);
  }

  async suspend(user: AuthJwtPayload, id: string): Promise<Vendor> {
    this.assertAdmin(user);
    const vendor = await this.vendors.findOne({ where: { id } });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
    vendor.status = VendorStatus.SUSPENDED;
    return this.vendors.save(vendor);
  }

  // ── Service catalog ───────────────────────────────────────────

  listServices(): Promise<Service[]> {
    return this.services.find({
      where: { isActive: true },
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  createService(user: AuthJwtPayload, dto: CreateServiceDto): Promise<Service> {
    this.assertAdmin(user);
    return this.services.save(this.services.create(dto));
  }

  // ── A vendor's own service offerings ─────────────────────────

  listVendorServices(vendorId: string): Promise<VendorServiceEntity[]> {
    return this.vendorServices.find({ where: { vendorId } });
  }

  async addVendorService(
    user: AuthJwtPayload,
    vendorId: string,
    dto: CreateVendorServiceDto,
  ): Promise<VendorServiceEntity> {
    await this.assertOwnsVendor(user, vendorId);
    return this.vendorServices.save(
      this.vendorServices.create({ ...dto, vendorId }),
    );
  }

  async removeVendorService(
    user: AuthJwtPayload,
    vendorId: string,
    serviceId: string,
  ): Promise<{ id: string }> {
    await this.assertOwnsVendor(user, vendorId);
    await this.vendorServices.delete({ vendorId, serviceId });
    return { id: serviceId };
  }

  // ── A vendor's coverage areas ─────────────────────────────────

  listServiceAreas(vendorId: string): Promise<VendorServiceArea[]> {
    return this.vendorServiceAreas.find({ where: { vendorId } });
  }

  async addServiceArea(
    user: AuthJwtPayload,
    vendorId: string,
    dto: CreateVendorServiceAreaDto,
  ): Promise<VendorServiceArea> {
    await this.assertOwnsVendor(user, vendorId);
    return this.vendorServiceAreas.save(
      this.vendorServiceAreas.create({ ...dto, vendorId }),
    );
  }

  // ── Ratings ───────────────────────────────────────────────────

  listRatings(vendorId: string): Promise<VendorRating[]> {
    return this.vendorRatings.find({
      where: { vendorId },
      order: { createdAt: 'DESC' },
    });
  }

  async rate(
    user: AuthJwtPayload,
    vendorId: string,
    dto: CreateVendorRatingDto,
  ): Promise<VendorRating> {
    if (!isBackOffice(user) && !OWNER_ROLES.includes(user.role)) {
      throw new ForbiddenException('Not allowed to rate vendors');
    }
    const job = await this.maintenanceJobs.findOne({
      where: { id: dto.maintenanceJobId },
    });
    if (!job || job.vendorId !== vendorId) {
      throw new NotFoundException('Maintenance job not found for this vendor');
    }
    if (job.status !== JobStatus.COMPLETED) {
      throw new ForbiddenException('Only a completed job can be rated');
    }
    const existing = await this.vendorRatings.findOne({
      where: { maintenanceJobId: dto.maintenanceJobId },
    });
    if (existing) {
      throw new ConflictException('This job has already been rated');
    }

    const rating = await this.vendorRatings.save(
      this.vendorRatings.create({
        vendorId,
        maintenanceJobId: dto.maintenanceJobId,
        ratedByUserId: user.id,
        score: dto.score,
        comment: dto.comment ?? null,
      }),
    );

    const vendor = await this.vendors.findOneOrFail({
      where: { id: vendorId },
    });
    const priorTotal = Number(vendor.rating ?? 0) * vendor.ratingsCount;
    vendor.ratingsCount += 1;
    vendor.rating = ((priorTotal + dto.score) / vendor.ratingsCount).toFixed(2);
    await this.vendors.save(vendor);

    return rating;
  }

  // ── Access rules ──────────────────────────────────────────────

  private assertAdmin(user: AuthJwtPayload) {
    if (!seesEverything(user)) {
      throw new ForbiddenException('Admin only');
    }
  }

  private async findManageable(
    user: AuthJwtPayload,
    id: string,
  ): Promise<Vendor> {
    const vendor = await this.vendors.findOne({ where: { id } });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
    if (seesEverything(user)) {
      return vendor;
    }
    if (user.role === UserRole.VENDOR && vendor.userId === user.id) {
      return vendor;
    }
    throw new NotFoundException('Vendor not found');
  }

  private async assertOwnsVendor(user: AuthJwtPayload, vendorId: string) {
    if (seesEverything(user)) {
      return;
    }
    const vendor = await this.vendors.findOne({ where: { id: vendorId } });
    if (!vendor || vendor.userId !== user.id || user.role !== UserRole.VENDOR) {
      throw new ForbiddenException('You do not manage this vendor profile');
    }
  }
}
