import { randomUUID } from 'node:crypto';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, FindOptionsRelations, Repository } from 'typeorm';
import { MaintenanceRequest } from './entities/maintenance-request.entity';
import { MaintenanceRequestEvent } from './entities/maintenance-request-event.entity';
import {
  MaintenanceAttachment,
  MaintenanceAttachableType,
} from './entities/maintenance-attachment.entity';
import { MaintenanceQuote } from './entities/maintenance-quote.entity';
import { MaintenanceJob } from './entities/maintenance-job.entity';
import { Unit } from '../properties/entities/unit.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { UserRole } from '../auth/enums/role.enum';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';
import { AssignVendorDto } from './dto/assign-vendor.dto';
import { CreateMaintenanceQuoteDto } from './dto/create-maintenance-quote.dto';
import { RespondQuoteDto } from './dto/respond-quote.dto';
import { CreateMaintenanceJobDto } from './dto/create-maintenance-job.dto';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';
import {
  OWNER_ROLES,
  seesEverything,
  unitBelongsToOwner,
} from '../common/access';
import {
  JobStatus,
  MaintenanceStatus,
  QuoteStatus,
  VendorStatus,
} from '../common/enums/maintenance.enum';

const isBackOffice = (user: AuthJwtPayload) =>
  seesEverything(user) || user.role === UserRole.STAFF;

/** The mobile/web clients render a unit label, property name, reporter name
 * and vendor name, so those relations are always worth the join. */
const REQUEST_RELATIONS: FindOptionsRelations<MaintenanceRequest> = {
  unit: { property: true },
  reportedBy: true,
  vendor: true,
};

@Injectable()
export class MaintenanceService {
  private requests: Repository<MaintenanceRequest>;
  private events: Repository<MaintenanceRequestEvent>;
  private attachments: Repository<MaintenanceAttachment>;
  private quotes: Repository<MaintenanceQuote>;
  private jobs: Repository<MaintenanceJob>;
  private units: Repository<Unit>;
  private vendors: Repository<Vendor>;

  constructor(private readonly dataSource: DataSource) {
    this.requests = dataSource.getRepository(MaintenanceRequest);
    this.events = dataSource.getRepository(MaintenanceRequestEvent);
    this.attachments = dataSource.getRepository(MaintenanceAttachment);
    this.quotes = dataSource.getRepository(MaintenanceQuote);
    this.jobs = dataSource.getRepository(MaintenanceJob);
    this.units = dataSource.getRepository(Unit);
    this.vendors = dataSource.getRepository(Vendor);
  }

  // ── Requests ──────────────────────────────────────────────────

  async findAll(user: AuthJwtPayload): Promise<MaintenanceRequest[]> {
    if (isBackOffice(user)) {
      return this.requests.find({
        relations: REQUEST_RELATIONS,
        order: { openedAt: 'DESC' },
      });
    }
    if (OWNER_ROLES.includes(user.role)) {
      return this.scopedToOwner(user.id).getMany();
    }
    if (user.role === UserRole.VENDOR) {
      const vendor = await this.vendorOf(user);
      return vendor
        ? this.requests.find({
            where: { vendorId: vendor.id },
            relations: REQUEST_RELATIONS,
          })
        : [];
    }
    if (user.role === UserRole.TENANT) {
      return this.requests.find({
        where: { reportedByUserId: user.id },
        relations: REQUEST_RELATIONS,
      });
    }
    throw new ForbiddenException('Not allowed to view maintenance requests');
  }

  async findOne(user: AuthJwtPayload, id: string): Promise<MaintenanceRequest> {
    const request = await this.requests.findOne({
      where: { id },
      relations: REQUEST_RELATIONS,
    });
    if (!request || !(await this.canView(user, request))) {
      throw new NotFoundException('Maintenance request not found');
    }
    return request;
  }

  async create(
    user: AuthJwtPayload,
    dto: CreateMaintenanceRequestDto,
  ): Promise<MaintenanceRequest> {
    const unit = await this.units.findOne({ where: { id: dto.unitId } });
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }
    if (user.role === UserRole.TENANT && unit.tenantId !== user.id) {
      throw new ForbiddenException('You do not rent this unit');
    }
    if (
      OWNER_ROLES.includes(user.role) &&
      !(await unitBelongsToOwner(this.units, user.id, unit.id))
    ) {
      throw new ForbiddenException('You do not manage this unit');
    }
    const request = await this.requests.save(
      this.requests.create({
        reference: `MR-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
        unitId: dto.unitId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        categoryServiceId: dto.categoryServiceId ?? null,
        reportedByUserId: user.id,
        status: MaintenanceStatus.OPEN,
        openedAt: new Date(),
      }),
    );
    await this.logEvent(request.id, user.id, 'created', null, request.status);
    return request;
  }

  async updateStatus(
    user: AuthJwtPayload,
    id: string,
    dto: UpdateRequestStatusDto,
  ): Promise<MaintenanceRequest> {
    const request = await this.findManageable(user, id);
    const from = request.status;
    request.status = dto.status;
    if (dto.status === MaintenanceStatus.RESOLVED) {
      request.resolvedAt = new Date();
    }
    if (dto.status === MaintenanceStatus.CLOSED) {
      request.closedAt = new Date();
    }
    await this.requests.save(request);
    await this.logEvent(
      request.id,
      user.id,
      'status_changed',
      from,
      dto.status,
      dto.notes,
    );
    return request;
  }

  async assignVendor(
    user: AuthJwtPayload,
    id: string,
    dto: AssignVendorDto,
  ): Promise<MaintenanceRequest> {
    const request = await this.findManageable(user, id);
    const vendor = await this.vendors.findOne({ where: { id: dto.vendorId } });
    if (!vendor || vendor.status !== VendorStatus.APPROVED) {
      throw new NotFoundException('Approved vendor not found');
    }
    const from = request.status;
    request.vendorId = dto.vendorId;
    request.status = MaintenanceStatus.ASSIGNED;
    await this.requests.save(request);
    await this.logEvent(
      request.id,
      user.id,
      'vendor_assigned',
      from,
      request.status,
    );
    return request;
  }

  async listEvents(
    user: AuthJwtPayload,
    requestId: string,
  ): Promise<MaintenanceRequestEvent[]> {
    await this.findOne(user, requestId);
    return this.events.find({
      where: { maintenanceRequestId: requestId },
      order: { createdAt: 'ASC' },
    });
  }

  // ── Quotes ────────────────────────────────────────────────────

  async listQuotes(
    user: AuthJwtPayload,
    requestId: string,
  ): Promise<MaintenanceQuote[]> {
    await this.findOne(user, requestId);
    return this.quotes.find({ where: { maintenanceRequestId: requestId } });
  }

  async createQuote(
    user: AuthJwtPayload,
    requestId: string,
    dto: CreateMaintenanceQuoteDto,
  ): Promise<MaintenanceQuote> {
    const vendor = await this.vendorOf(user);
    if (!vendor || vendor.status !== VendorStatus.APPROVED) {
      throw new ForbiddenException(
        'Only an approved vendor can submit a quote',
      );
    }
    const request = await this.requests.findOne({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException('Maintenance request not found');
    }
    return this.quotes.save(
      this.quotes.create({
        ...dto,
        maintenanceRequestId: requestId,
        vendorId: vendor.id,
        status: QuoteStatus.SUBMITTED,
        submittedAt: new Date(),
      }),
    );
  }

  async respondQuote(
    user: AuthJwtPayload,
    quoteId: string,
    dto: RespondQuoteDto,
  ): Promise<MaintenanceQuote> {
    const quote = await this.quotes.findOne({ where: { id: quoteId } });
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }
    const request = await this.findManageable(user, quote.maintenanceRequestId);
    quote.status = dto.approve ? QuoteStatus.APPROVED : QuoteStatus.REJECTED;
    quote.respondedAt = new Date();
    quote.respondedByUserId = user.id;
    await this.quotes.save(quote);
    if (dto.approve) {
      request.acceptedQuoteId = quote.id;
      request.status = MaintenanceStatus.APPROVED;
      await this.requests.save(request);
    }
    return quote;
  }

  // ── Jobs ──────────────────────────────────────────────────────

  async listJobs(
    user: AuthJwtPayload,
    requestId: string,
  ): Promise<MaintenanceJob[]> {
    await this.findOne(user, requestId);
    return this.jobs.find({ where: { maintenanceRequestId: requestId } });
  }

  async createJob(
    user: AuthJwtPayload,
    requestId: string,
    dto: CreateMaintenanceJobDto,
  ): Promise<MaintenanceJob> {
    const request = await this.findManageable(user, requestId);
    const vendor = await this.vendors.findOne({ where: { id: dto.vendorId } });
    if (!vendor || vendor.status !== VendorStatus.APPROVED) {
      throw new NotFoundException('Approved vendor not found');
    }
    const job = await this.jobs.save(
      this.jobs.create({
        ...dto,
        maintenanceRequestId: requestId,
        status: JobStatus.ASSIGNED,
        assignedAt: new Date(),
      }),
    );
    request.status = MaintenanceStatus.IN_PROGRESS;
    await this.requests.save(request);
    return job;
  }

  async updateJobStatus(
    user: AuthJwtPayload,
    jobId: string,
    dto: UpdateJobStatusDto,
  ): Promise<MaintenanceJob> {
    const job = await this.jobs.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Maintenance job not found');
    }
    const isAssignedVendor =
      user.role === UserRole.VENDOR &&
      (await this.vendorOf(user))?.id === job.vendorId;
    if (!isAssignedVendor) {
      await this.findManageable(user, job.maintenanceRequestId);
    }

    job.status = dto.status;
    const now = new Date();
    if (dto.status === JobStatus.ACCEPTED) job.acceptedAt = now;
    if (dto.status === JobStatus.DECLINED)
      job.declineReason = dto.declineReason ?? null;
    if (dto.status === JobStatus.IN_PROGRESS) job.startedAt = now;
    if (dto.status === JobStatus.COMPLETED) {
      job.completedAt = now;
      job.completionNotes = dto.completionNotes ?? null;
      job.finalCostMinor = dto.finalCostMinor ?? job.agreedCostMinor;
      await this.vendors.increment({ id: job.vendorId }, 'jobsCompleted', 1);
      await this.requests.update(
        { id: job.maintenanceRequestId },
        { status: MaintenanceStatus.RESOLVED, resolvedAt: now },
      );
    }
    return this.jobs.save(job);
  }

  // ── Attachments ───────────────────────────────────────────────

  async listAttachments(
    user: AuthJwtPayload,
    attachableType: MaintenanceAttachableType,
    attachableId: string,
  ): Promise<MaintenanceAttachment[]> {
    await this.assertCanAccessAttachable(user, attachableType, attachableId);
    return this.attachments.find({ where: { attachableType, attachableId } });
  }

  async addAttachment(
    user: AuthJwtPayload,
    attachableType: MaintenanceAttachableType,
    attachableId: string,
    file: Express.Multer.File,
  ): Promise<MaintenanceAttachment> {
    await this.assertCanAccessAttachable(user, attachableType, attachableId);
    return this.attachments.save(
      this.attachments.create({
        attachableType,
        attachableId,
        disk: 'local',
        path: file.path,
        originalName: file.originalname,
        mime: file.mimetype,
        sizeBytes: String(file.size),
        uploadedByUserId: user.id,
      }),
    );
  }

  private async assertCanAccessAttachable(
    user: AuthJwtPayload,
    attachableType: MaintenanceAttachableType,
    attachableId: string,
  ) {
    if (attachableType === 'request') {
      await this.findOne(user, attachableId);
      return;
    }
    if (attachableType === 'quote') {
      const quote = await this.quotes.findOne({ where: { id: attachableId } });
      if (!quote) throw new NotFoundException('Quote not found');
      await this.findOne(user, quote.maintenanceRequestId);
      return;
    }
    const job = await this.jobs.findOne({ where: { id: attachableId } });
    if (!job) throw new NotFoundException('Job not found');
    await this.findOne(user, job.maintenanceRequestId);
  }

  // ── Access rules ──────────────────────────────────────────────

  private async canView(
    user: AuthJwtPayload,
    request: MaintenanceRequest,
  ): Promise<boolean> {
    if (isBackOffice(user)) return true;
    if (request.reportedByUserId === user.id) return true;
    if (OWNER_ROLES.includes(user.role)) {
      return unitBelongsToOwner(this.units, user.id, request.unitId);
    }
    if (user.role === UserRole.VENDOR) {
      const vendor = await this.vendorOf(user);
      return !!vendor && vendor.id === request.vendorId;
    }
    return false;
  }

  private async findManageable(
    user: AuthJwtPayload,
    id: string,
  ): Promise<MaintenanceRequest> {
    const request = await this.requests.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException('Maintenance request not found');
    }
    if (isBackOffice(user)) {
      return request;
    }
    if (
      OWNER_ROLES.includes(user.role) &&
      (await unitBelongsToOwner(this.units, user.id, request.unitId))
    ) {
      return request;
    }
    throw new NotFoundException('Maintenance request not found');
  }

  private vendorOf(user: AuthJwtPayload): Promise<Vendor | null> {
    if (user.role !== UserRole.VENDOR) return Promise.resolve(null);
    return this.vendors.findOne({ where: { userId: user.id } });
  }

  private async logEvent(
    maintenanceRequestId: string,
    actorUserId: string,
    type: string,
    fromStatus: string | null,
    toStatus: string | null,
    notes?: string,
  ) {
    await this.events.save(
      this.events.create({
        maintenanceRequestId,
        actorUserId,
        type,
        fromStatus,
        toStatus,
        notes: notes ?? null,
      }),
    );
  }

  private scopedToOwner(ownerId: string) {
    return this.requests
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.unit', 'unit')
      .leftJoinAndSelect('unit.property', 'property')
      .leftJoinAndSelect('request.reportedBy', 'reportedBy')
      .leftJoinAndSelect('request.vendor', 'vendor')
      .where('property.owner_id = :ownerId', { ownerId })
      .orderBy('request.openedAt', 'DESC');
  }
}
