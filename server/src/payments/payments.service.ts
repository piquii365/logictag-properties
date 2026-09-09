import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentAllocation } from './entities/payment-allocation.entity';
import { PaymentWebhookEvent } from './entities/payment-webhook-event.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Lease } from '../leases/entities/lease.entity';
import { Unit } from '../properties/entities/unit.entity';
import { Property } from '../properties/entities/property.entity';
import { RentCharge } from '../billing/entities/rent-charge.entity';
import { UtilityCharge } from '../utilities/entities/utility-charge.entity';
import type { AdjustableType } from '../billing/entities/charge-adjustment.entity';
import { UserRole } from '../auth/enums/role.enum';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { CreatePaymentAllocationDto } from './dto/create-payment-allocation.dto';
import { InitiatePesepayDto } from './dto/initiate-pesepay.dto';
import { OWNER_ROLES, seesEverything } from '../common/access';
import {
  ChargeStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
} from '../common/enums/billing.enum';
import { ConfigService } from '../config/config.service';
import { PesepayService } from './pesepay/pesepay.service';
import { AccountingService } from '../accounting/accounting.service';

const isBackOffice = (user: AuthJwtPayload) =>
  seesEverything(user) || user.role === UserRole.STAFF;

@Injectable()
export class PaymentsService {
  private payments: Repository<Payment>;
  private allocations: Repository<PaymentAllocation>;
  private webhookEvents: Repository<PaymentWebhookEvent>;
  private tenants: Repository<Tenant>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly pesepay: PesepayService,
    private readonly accounting: AccountingService,
  ) {
    this.payments = dataSource.getRepository(Payment);
    this.allocations = dataSource.getRepository(PaymentAllocation);
    this.webhookEvents = dataSource.getRepository(PaymentWebhookEvent);
    this.tenants = dataSource.getRepository(Tenant);
  }

  async findAll(user: AuthJwtPayload): Promise<Payment[]> {
    if (isBackOffice(user)) {
      return this.payments.find({ order: { createdAt: 'DESC' } });
    }
    if (OWNER_ROLES.includes(user.role)) {
      return this.scopedToOwner(user.id).getMany();
    }
    if (user.role === UserRole.TENANT) {
      return this.scopedToTenant(user.id).getMany();
    }
    // Vendors are service providers, not payers — they have no payment
    // records in this model, so return an empty list rather than 403 so the
    // mobile Payments tab renders a clean empty state.
    if (user.role === UserRole.VENDOR) {
      return [];
    }
    throw new ForbiddenException('Not allowed to view payments');
  }

  async findOne(user: AuthJwtPayload, id: string): Promise<Payment> {
    const payment = await this.payments.findOne({ where: { id } });
    if (!payment || !(await this.canView(user, payment))) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async create(user: AuthJwtPayload, dto: CreatePaymentDto): Promise<Payment> {
    this.assertManages(user);
    const tenant = await this.tenants.findOne({ where: { id: dto.tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return this.payments.save(
      this.payments.create({
        ...dto,
        merchantReference: randomUUID().replace(/-/g, ''),
        createdByUserId: user.id,
      }),
    );
  }

  async updateStatus(
    user: AuthJwtPayload,
    id: string,
    dto: UpdatePaymentStatusDto,
  ): Promise<Payment> {
    const payment = await this.findManageable(user, id);
    payment.status = dto.status;
    payment.failureReason = dto.failureReason ?? null;
    if (dto.status === PaymentStatus.SUCCEEDED) {
      payment.paidAt = new Date();
    }
    return this.payments.save(payment);
  }

  /** Attach a proof-of-payment document. The tenant who owns the payment and
   * any management role (back-office / owner) may upload. */
  async uploadProof(
    user: AuthJwtPayload,
    id: string,
    file?: Express.Multer.File,
  ): Promise<Payment> {
    if (!file) throw new BadRequestException('No file uploaded');
    const payment = await this.payments.findOne({ where: { id } });
    if (!payment || !(await this.canView(user, payment))) {
      throw new NotFoundException('Payment not found');
    }
    payment.proofUrl = `/uploads/payment-proofs/${file.filename}`;
    return this.payments.save(payment);
  }

  // ── PesePay (real gateway; seamless mobile-money) ────────────

  private assertPesepayConfigured() {
    if (!this.config.isPesepayConfigured) {
      throw new ServiceUnavailableException(
        'PesePay is not configured on this server yet',
      );
    }
  }

  getPesepayMethods(currencyCode: string) {
    this.assertPesepayConfigured();
    return this.pesepay.getPaymentMethods(currencyCode);
  }

  /** Sends an existing pending payment to PesePay for the customer to
   * approve on their phone. Open to the tenant it belongs to (self-service)
   * as well as back-office/owner (recording on a tenant's behalf). */
  async initiatePesepay(
    user: AuthJwtPayload,
    id: string,
    dto: InitiatePesepayDto,
  ): Promise<Payment> {
    this.assertPesepayConfigured();
    const payment = await this.findOne(user, id);
    if (payment.status !== PaymentStatus.PENDING) {
      throw new ForbiddenException('This payment has already been processed');
    }
    const tenant = await this.tenants.findOne({
      where: { id: payment.tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const transaction = await this.pesepay.initiateSeamlessPayment({
      amount: Number(payment.amountMinor) / 100,
      currencyCode: payment.currency,
      merchantReference: payment.merchantReference,
      reasonForPayment: `Payment ${payment.merchantReference}`,
      phoneNumber: dto.phoneNumber,
      paymentMethodCode: dto.paymentMethodCode,
      email: tenant.email ?? undefined,
      name: `${tenant.firstName} ${tenant.lastName}`,
    });

    payment.provider = PaymentProvider.PESEPAY;
    payment.method = PaymentMethod.MOBILE_MONEY;
    payment.providerReference = transaction.referenceNumber;
    payment.pollUrl = transaction.pollUrl;
    payment.providerMethodCode = dto.paymentMethodCode;
    payment.status = this.mapPesepayStatus(transaction.transactionStatus);
    return this.payments.save(payment);
  }

  /** Polled by the client instead of relying on PesePay's resultUrl webhook
   * (which needs a publicly reachable server to ever fire in dev). */
  async checkPesepayStatus(user: AuthJwtPayload, id: string): Promise<Payment> {
    this.assertPesepayConfigured();
    const payment = await this.findOne(user, id);
    if (!payment.providerReference) {
      throw new ForbiddenException('This payment was never sent to PesePay');
    }
    const transaction = await this.pesepay.checkStatus(
      payment.providerReference,
    );
    const status = this.mapPesepayStatus(transaction.transactionStatus);
    if (status !== payment.status) {
      payment.status = status;
      if (status === PaymentStatus.SUCCEEDED) {
        payment.paidAt = new Date();
      }
      await this.payments.save(payment);
    }
    return payment;
  }

  private mapPesepayStatus(status: string): PaymentStatus {
    switch (status) {
      case 'SUCCESS':
        return PaymentStatus.SUCCEEDED;
      case 'INITIATED':
        return PaymentStatus.INITIATED;
      case 'PENDING':
      case 'PROCESSING':
      case 'PARTIALLY_PAID':
        return PaymentStatus.PENDING;
      case 'REVERSED':
        return PaymentStatus.REVERSED;
      default:
        return PaymentStatus.FAILED;
    }
  }

  // ── Allocations ───────────────────────────────────────────────

  async listAllocations(
    user: AuthJwtPayload,
    paymentId: string,
  ): Promise<PaymentAllocation[]> {
    await this.findOne(user, paymentId);
    return this.allocations.find({ where: { paymentId } });
  }

  async createAllocation(
    user: AuthJwtPayload,
    dto: CreatePaymentAllocationDto,
  ): Promise<PaymentAllocation> {
    const payment = await this.findManageable(user, dto.paymentId);
    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestException('Only succeeded payments can be allocated');
    }
    const remaining =
      BigInt(payment.amountMinor) - BigInt(payment.allocatedMinor);
    if (BigInt(dto.amountMinor) > remaining) {
      throw new ForbiddenException(
        "Allocation exceeds the payment's unallocated balance",
      );
    }

    const chargeRepository =
      dto.allocatableType === 'rent_charges'
        ? this.dataSource.getRepository(RentCharge)
        : this.dataSource.getRepository(UtilityCharge);
    const charge = await chargeRepository.findOne({
      where: { id: dto.allocatableId },
    });
    if (!charge || charge.status === ChargeStatus.VOIDED) {
      throw new NotFoundException('Charge not found or already voided');
    }
    const chargeRemaining =
      BigInt(charge.amountMinor) - BigInt(charge.allocatedMinor);
    if (BigInt(dto.amountMinor) > chargeRemaining) {
      throw new BadRequestException(
        "Allocation exceeds the charge's outstanding balance",
      );
    }

    const allocation = await this.allocations.save(
      this.allocations.create({
        ...dto,
        allocatedAt: new Date(),
        createdByUserId: user.id,
      }),
    );

    payment.allocatedMinor = (
      BigInt(payment.allocatedMinor) + BigInt(dto.amountMinor)
    ).toString();
    await this.payments.save(payment);

    await this.applyAllocationToCharge(
      dto.allocatableType,
      dto.allocatableId,
      dto.amountMinor,
    );

    await this.accounting.recordPaymentAllocation(
      allocation.id,
      dto.amountMinor,
      user.id,
    );

    return allocation;
  }

  async autoAllocate(
    user: AuthJwtPayload,
    paymentId: string,
  ): Promise<PaymentAllocation[]> {
    const payment = await this.findManageable(user, paymentId);
    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestException('Only succeeded payments can be allocated');
    }
    if (!payment.leaseId) {
      throw new BadRequestException(
        'Automatic allocation requires a payment linked to a lease',
      );
    }

    const charges = await this.dataSource
      .getRepository(RentCharge)
      .createQueryBuilder('charge')
      .where('charge.lease_id = :leaseId', { leaseId: payment.leaseId })
      .andWhere('charge.status IN (:...statuses)', {
        statuses: [ChargeStatus.OUTSTANDING, ChargeStatus.PART_PAID],
      })
      .andWhere('charge.currency = :currency', { currency: payment.currency })
      .orderBy('charge.due_date', 'ASC')
      .addOrderBy('charge.period_start', 'ASC')
      .getMany();

    const allocations: PaymentAllocation[] = [];
    let remaining =
      BigInt(payment.amountMinor) - BigInt(payment.allocatedMinor);
    for (const charge of charges) {
      if (remaining <= 0n) break;
      const outstanding =
        BigInt(charge.amountMinor) - BigInt(charge.allocatedMinor);
      const amountMinor = (
        remaining < outstanding ? remaining : outstanding
      ).toString();
      allocations.push(
        await this.createAllocation(user, {
          paymentId,
          allocatableType: 'rent_charges',
          allocatableId: charge.id,
          amountMinor,
        }),
      );
      remaining -= BigInt(amountMinor);
    }
    return allocations;
  }

  /** The charge itself (not just the PaymentAllocation row) is the source of
   * truth for "is this paid?", so every allocation has to update it too. */
  private async applyAllocationToCharge(
    type: AdjustableType,
    chargeId: string,
    amountMinor: string,
  ) {
    const nextState = (charge: {
      amountMinor: string;
      allocatedMinor: string;
    }) => {
      const allocatedMinor = (
        BigInt(charge.allocatedMinor) + BigInt(amountMinor)
      ).toString();
      const status =
        BigInt(allocatedMinor) >= BigInt(charge.amountMinor)
          ? ChargeStatus.PAID
          : ChargeStatus.PART_PAID;
      return { allocatedMinor, status };
    };

    if (type === 'rent_charges') {
      const repo = this.dataSource.getRepository(RentCharge);
      const charge = await repo.findOne({ where: { id: chargeId } });
      if (!charge) return;
      Object.assign(charge, nextState(charge));
      await repo.save(charge);
      return;
    }

    const repo = this.dataSource.getRepository(UtilityCharge);
    const charge = await repo.findOne({ where: { id: chargeId } });
    if (!charge) return;
    Object.assign(charge, nextState(charge));
    await repo.save(charge);
  }

  // ── Webhook events (admin visibility only) ───────────────────

  listWebhookEvents(user: AuthJwtPayload): Promise<PaymentWebhookEvent[]> {
    if (!seesEverything(user)) {
      throw new ForbiddenException('Admin only');
    }
    return this.webhookEvents.find({ order: { receivedAt: 'DESC' } });
  }

  // ── Access rules ──────────────────────────────────────────────

  private async canView(
    user: AuthJwtPayload,
    payment: Payment,
  ): Promise<boolean> {
    if (isBackOffice(user)) {
      return true;
    }
    if (OWNER_ROLES.includes(user.role)) {
      return (
        (await this.scopedToOwner(user.id)
          .andWhere('payment.id = :id', { id: payment.id })
          .getCount()) > 0
      );
    }
    if (user.role === UserRole.TENANT) {
      return (
        (await this.scopedToTenant(user.id)
          .andWhere('payment.id = :id', { id: payment.id })
          .getCount()) > 0
      );
    }
    return false;
  }

  private async findManageable(
    user: AuthJwtPayload,
    id: string,
  ): Promise<Payment> {
    const payment = await this.payments.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (isBackOffice(user)) {
      return payment;
    }
    if (
      OWNER_ROLES.includes(user.role) &&
      (await this.scopedToOwner(user.id)
        .andWhere('payment.id = :id', { id: payment.id })
        .getCount()) > 0
    ) {
      return payment;
    }
    throw new NotFoundException('Payment not found');
  }

  private assertManages(user: AuthJwtPayload) {
    if (!isBackOffice(user) && !OWNER_ROLES.includes(user.role)) {
      throw new ForbiddenException('Not allowed to manage payments');
    }
  }

  /** Only payments tied to a lease can be traced to an owner; walk-in
   * payments with no lease are back-office/admin visibility only. */
  private scopedToOwner(ownerId: string) {
    return this.payments
      .createQueryBuilder('payment')
      .innerJoin(Lease, 'lease', 'lease.id = payment.lease_id')
      .innerJoin(Unit, 'unit', 'unit.id = lease.unit_id')
      .innerJoin(
        Property,
        'property',
        'property.id = unit.property_id AND property.owner_id = :ownerId',
        { ownerId },
      );
  }

  private scopedToTenant(userId: string) {
    return this.payments
      .createQueryBuilder('payment')
      .innerJoin(
        Tenant,
        'tenant',
        'tenant.id = payment.tenant_id AND tenant.user_id = :userId',
        { userId },
      );
  }
}
