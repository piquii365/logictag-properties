import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionPayment } from './entities/subscription-payment.entity';
import { Trial } from './entities/trial.entity';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscribeDto } from './dto/subscribe.dto';
import { StartTrialDto } from './dto/start-trial.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { seesEverything } from '../common/access';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { Unit } from '../properties/entities/unit.entity';
import { Property } from '../properties/entities/property.entity';
import {
  SubscriptionStatus,
  TrialStatus,
} from '../common/enums/subscriptions.enum';
import { UnitStatus } from '../properties/enums/unit-status.enum';

@Injectable()
export class SubscriptionsService {
  private plans: Repository<SubscriptionPlan>;
  private subscriptions: Repository<Subscription>;
  private payments: Repository<SubscriptionPayment>;
  private trials: Repository<Trial>;
  private units: Repository<Unit>;
  private properties: Repository<Property>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {
    this.plans = dataSource.getRepository(SubscriptionPlan);
    this.subscriptions = dataSource.getRepository(Subscription);
    this.payments = dataSource.getRepository(SubscriptionPayment);
    this.trials = dataSource.getRepository(Trial);
    this.units = dataSource.getRepository(Unit);
    this.properties = dataSource.getRepository(Property);
  }

  // ── Plans (public catalog) ────────────────────────────────────

  listPlans(user: AuthJwtPayload): Promise<SubscriptionPlan[]> {
    return this.plans.find({
      where: seesEverything(user) ? {} : { isActive: true },
      order: { amountMinor: 'ASC' },
    });
  }

  async createPlan(
    user: AuthJwtPayload,
    dto: CreateSubscriptionPlanDto,
  ): Promise<SubscriptionPlan> {
    this.assertAdmin(user);
    const saved = await this.plans.save(
      this.plans.create({
        ...dto,
        notificationSettings: dto.notificationSettings ?? {},
      }),
    );
    await this.audit.record({
      userId: user.id,
      action: 'subscription_plan.created',
      entityType: 'subscription_plan',
      entityId: saved.id,
      changes: { code: saved.code, name: saved.name },
      metadata: null,
      ipAddress: null,
      userAgent: null,
    });
    return saved;
  }

  async updatePlan(
    user: AuthJwtPayload,
    id: string,
    dto: UpdateSubscriptionPlanDto,
  ) {
    this.assertAdmin(user);
    const plan = await this.plans.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    Object.assign(plan, dto);
    const saved = await this.plans.save(plan);
    const subscriptions = await this.subscriptions.find({
      where: { planId: id },
    });
    await Promise.all(
      subscriptions.map((subscription) =>
        this.notifications.createSystemNotification({
          userId: subscription.userId,
          eventType: 'subscription_plan_changed',
          subject: `${saved.name} pricing has changed`,
          body:
            saved.description ??
            `The ${saved.name} subscription plan has been updated.`,
          entityType: 'subscription_plan',
          entityId: saved.id,
        }),
      ),
    );
    await this.audit.record({
      userId: user.id,
      action: 'subscription_plan.updated',
      entityType: 'subscription_plan',
      entityId: saved.id,
      changes: { ...dto } as Record<string, unknown>,
      metadata: null,
      ipAddress: null,
      userAgent: null,
    });
    return saved;
  }

  async removePlan(user: AuthJwtPayload, id: string): Promise<{ id: string }> {
    this.assertAdmin(user);
    const plan = await this.plans.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    const inUse = await this.subscriptions.count({ where: { planId: id } });
    if (inUse > 0) {
      throw new BadRequestException(
        `Cannot delete this plan: ${inUse} subscription(s) still reference it. ` +
          'Reassign or remove those subscriptions first.',
      );
    }
    await this.plans.remove(plan);
    await this.audit.record({
      userId: user.id,
      action: 'subscription_plan.deleted',
      entityType: 'subscription_plan',
      entityId: id,
      changes: { code: plan.code, name: plan.name },
      metadata: null,
      ipAddress: null,
      userAgent: null,
    });
    return { id };
  }

  // ── Subscriptions ─────────────────────────────────────────────

  async findAll(user: AuthJwtPayload): Promise<Subscription[]> {
    if (seesEverything(user)) {
      return this.subscriptions.find({
        relations: { plan: true, user: true },
        order: { createdAt: 'DESC' },
      });
    }
    return this.subscriptions.find({
      where: { userId: user.id },
      relations: { plan: true },
      order: { createdAt: 'DESC' },
    });
  }

  async subscribe(
    user: AuthJwtPayload,
    dto: SubscribeDto,
  ): Promise<Subscription> {
    const plan = await this.plans.findOne({ where: { id: dto.planId } });
    if (!plan || !plan.isActive) {
      throw new NotFoundException('Plan not found');
    }
    // Automatically capture occupied units for this owner
    const managedUnits = await this.countOccupiedUnits(user.id);
    if (plan.minimumUnits != null && managedUnits < plan.minimumUnits) {
      throw new BadRequestException(
        `This plan requires at least ${plan.minimumUnits} units`,
      );
    }
    if (plan.maximumUnits != null && managedUnits > plan.maximumUnits) {
      throw new BadRequestException(
        `This plan supports at most ${plan.maximumUnits} units`,
      );
    }
    if (plan.customPricing && !dto.agreedPricePerUnitMinor) {
      throw new BadRequestException(
        'A negotiated unit price is required for this plan',
      );
    }
    const now = new Date();
    const hasAnySubscription =
      (await this.subscriptions.count({ where: { userId: user.id } })) > 0;
    const defaultTrialDays = 60; // global 2-month trial
    const isTrialing = !hasAnySubscription;
    const trialEndsAt = isTrialing
      ? new Date(now.getTime() + defaultTrialDays * 24 * 60 * 60 * 1000)
      : null;

    const saved = await this.subscriptions.save(
      this.subscriptions.create({
        userId: user.id,
        planId: dto.planId,
        status: isTrialing
          ? SubscriptionStatus.TRIALING
          : SubscriptionStatus.ACTIVE,
        startedAt: now,
        trialEndsAt,
        currentPeriodStart: isTrialing ? null : now,
        currentPeriodEnd: null,
        provider: dto.provider ?? null,
        managedUnits,
        agreedPricePerUnitMinor: dto.agreedPricePerUnitMinor ?? null,
      }),
    );
    return this.subscriptions.findOneOrFail({
      where: { id: saved.id },
      relations: { plan: true },
    });
  }

  /** Admin-only: create a subscription for a specific user. */
  async adminCreateSubscription(
    user: AuthJwtPayload,
    dto: CreateSubscriptionDto,
  ): Promise<Subscription> {
    this.assertAdmin(user);
    const plan = await this.plans.findOne({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException('Plan not found');
    const now = new Date();
    const saved = await this.subscriptions.save(
      this.subscriptions.create({
        userId: dto.userId,
        planId: dto.planId,
        status: dto.status ?? SubscriptionStatus.ACTIVE,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : now,
        trialEndsAt: dto.trialEndsAt ? new Date(dto.trialEndsAt) : null,
        currentPeriodStart: dto.currentPeriodStart
          ? new Date(dto.currentPeriodStart)
          : now,
        currentPeriodEnd: dto.currentPeriodEnd
          ? new Date(dto.currentPeriodEnd)
          : null,
        provider: dto.provider ?? null,
        managedUnits: dto.managedUnits ?? 0,
        agreedPricePerUnitMinor: dto.agreedPricePerUnitMinor ?? null,
      }),
    );
    await this.audit.record({
      userId: user.id,
      action: 'subscription.created',
      entityType: 'subscription',
      entityId: saved.id,
      changes: {
        userId: dto.userId,
        planId: dto.planId,
        status: saved.status,
      },
      metadata: null,
      ipAddress: null,
      userAgent: null,
    });
    return this.subscriptions.findOneOrFail({
      where: { id: saved.id },
      relations: { plan: true },
    });
  }

  /** Admin-only: update an existing subscription. */
  async adminUpdateSubscription(
    user: AuthJwtPayload,
    id: string,
    dto: UpdateSubscriptionDto,
  ): Promise<Subscription> {
    this.assertAdmin(user);
    const subscription = await this.subscriptions.findOne({ where: { id } });
    if (!subscription) throw new NotFoundException('Subscription not found');
    if (dto.planId) {
      const plan = await this.plans.findOne({ where: { id: dto.planId } });
      if (!plan) throw new NotFoundException('Plan not found');
    }
    const patch: Partial<Subscription> = {};
    if (dto.planId !== undefined) patch.planId = dto.planId;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.startedAt !== undefined) patch.startedAt = new Date(dto.startedAt);
    if (dto.trialEndsAt !== undefined)
      patch.trialEndsAt = dto.trialEndsAt ? new Date(dto.trialEndsAt) : null;
    if (dto.currentPeriodStart !== undefined)
      patch.currentPeriodStart = dto.currentPeriodStart
        ? new Date(dto.currentPeriodStart)
        : null;
    if (dto.currentPeriodEnd !== undefined)
      patch.currentPeriodEnd = dto.currentPeriodEnd
        ? new Date(dto.currentPeriodEnd)
        : null;
    if (dto.managedUnits !== undefined) patch.managedUnits = dto.managedUnits;
    if (dto.agreedPricePerUnitMinor !== undefined)
      patch.agreedPricePerUnitMinor = dto.agreedPricePerUnitMinor;
    if (dto.provider !== undefined) patch.provider = dto.provider;
    Object.assign(subscription, patch);
    const saved = await this.subscriptions.save(subscription);
    await this.audit.record({
      userId: user.id,
      action: 'subscription.updated',
      entityType: 'subscription',
      entityId: saved.id,
      changes: { ...dto } as Record<string, unknown>,
      metadata: null,
      ipAddress: null,
      userAgent: null,
    });
    return this.subscriptions.findOneOrFail({
      where: { id: saved.id },
      relations: { plan: true },
    });
  }

  /** Admin-only: permanently remove a subscription. */
  async adminRemoveSubscription(
    user: AuthJwtPayload,
    id: string,
  ): Promise<{ id: string }> {
    this.assertAdmin(user);
    const subscription = await this.subscriptions.findOne({ where: { id } });
    if (!subscription) throw new NotFoundException('Subscription not found');
    await this.subscriptions.remove(subscription);
    await this.audit.record({
      userId: user.id,
      action: 'subscription.deleted',
      entityType: 'subscription',
      entityId: id,
      changes: {
        userId: subscription.userId,
        planId: subscription.planId,
        status: subscription.status,
      },
      metadata: null,
      ipAddress: null,
      userAgent: null,
    });
    return { id };
  }

  async cancel(user: AuthJwtPayload, id: string): Promise<Subscription> {
    const subscription = await this.findManageable(user, id);
    subscription.status = SubscriptionStatus.CANCELED;
    subscription.canceledAt = new Date();
    const saved = await this.subscriptions.save(subscription);
    return this.subscriptions.findOneOrFail({
      where: { id: saved.id },
      relations: { plan: true },
    });
  }

  async resume(user: AuthJwtPayload, id: string): Promise<Subscription> {
    const subscription = await this.findManageable(user, id);
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.canceledAt = null;
    subscription.currentPeriodStart = new Date();
    const saved = await this.subscriptions.save(subscription);
    return this.subscriptions.findOneOrFail({
      where: { id: saved.id },
      relations: { plan: true },
    });
  }

  // ── Subscription payments ────────────────────────────────────

  async listPayments(
    user: AuthJwtPayload,
    subscriptionId: string,
  ): Promise<SubscriptionPayment[]> {
    await this.findManageable(user, subscriptionId);
    return this.payments.find({
      where: { subscriptionId },
      order: { createdAt: 'DESC' },
    });
  }

  /** Admin-only: every subscription payment across all accounts, enriched
   * with the owning subscription, its plan and the paying user. */
  async listAllPayments(user: AuthJwtPayload): Promise<SubscriptionPayment[]> {
    this.assertAdmin(user);
    return this.payments.find({
      relations: {
        subscription: { plan: true, user: true },
      },
      order: { createdAt: 'DESC' },
      take: 500,
    });
  }

  async recordPayment(
    user: AuthJwtPayload,
    subscriptionId: string,
  ): Promise<SubscriptionPayment> {
    const subscription = await this.findManageable(user, subscriptionId);
    const plan = await this.plans.findOneOrFail({
      where: { id: subscription.planId },
    });
    return this.payments.save(
      this.payments.create({
        subscriptionId,
        amountMinor:
          plan.pricePerUnitMinor && subscription.managedUnits > 0
            ? (
                BigInt(plan.pricePerUnitMinor) *
                BigInt(subscription.managedUnits)
              ).toString()
            : plan.amountMinor,
        currency: plan.currency,
        provider: subscription.provider,
        status: 'pending',
      }),
    );
  }

  async changePlan(
    user: AuthJwtPayload,
    id: string,
    dto: {
      planId: string;
      agreedPricePerUnitMinor?: string;
      provider?: 'pesepay';
    },
  ): Promise<Subscription> {
    const subscription = await this.findManageable(user, id);
    const plan = await this.plans.findOne({ where: { id: dto.planId } });
    if (!plan || !plan.isActive) {
      throw new NotFoundException('Plan not found');
    }
    const managedUnits = await this.countOccupiedUnits(subscription.userId);
    if (plan.minimumUnits != null && managedUnits < plan.minimumUnits) {
      throw new BadRequestException(
        `This plan requires at least ${plan.minimumUnits} units`,
      );
    }
    if (plan.maximumUnits != null && managedUnits > plan.maximumUnits) {
      throw new BadRequestException(
        `This plan supports at most ${plan.maximumUnits} units`,
      );
    }
    if (plan.customPricing && !dto.agreedPricePerUnitMinor) {
      throw new BadRequestException(
        'A negotiated unit price is required for this plan',
      );
    }
    subscription.planId = dto.planId;
    subscription.provider = dto.provider ?? subscription.provider;
    subscription.agreedPricePerUnitMinor = dto.agreedPricePerUnitMinor ?? null;
    // Do not change status or trial info on plan change.
    const saved = await this.subscriptions.save(subscription);
    return this.subscriptions.findOneOrFail({
      where: { id: saved.id },
      relations: { plan: true },
    });
  }

  async markPaymentStatus(
    user: AuthJwtPayload,
    paymentId: string,
    status: 'succeeded' | 'failed',
  ): Promise<SubscriptionPayment> {
    this.assertAdmin(user);
    const payment = await this.payments.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Subscription payment not found');
    }
    payment.status = status;
    if (status === 'succeeded') {
      payment.paidAt = new Date();
      await this.subscriptions.update(
        { id: payment.subscriptionId },
        { status: SubscriptionStatus.ACTIVE, currentPeriodStart: new Date() },
      );
    }
    const saved = await this.payments.save(payment);
    await this.audit.record({
      userId: user.id,
      action: `subscription_payment.${status}`,
      entityType: 'subscription_payment',
      entityId: saved.id,
      changes: { status, subscriptionId: saved.subscriptionId },
      metadata: null,
      ipAddress: null,
      userAgent: null,
    });
    return saved;
  }

  // ── Trials ────────────────────────────────────────────────────

  async findAllTrials(user: AuthJwtPayload): Promise<Trial[]> {
    if (seesEverything(user)) {
      return this.trials.find({ order: { startsAt: 'DESC' } });
    }
    return this.trials.find({ where: { userId: user.id } });
  }

  async startTrial(user: AuthJwtPayload, dto: StartTrialDto): Promise<Trial> {
    const plan = await this.plans.findOne({ where: { id: dto.planId } });
    if (!plan || !plan.trialDays) {
      throw new NotFoundException('Plan has no trial to start');
    }
    const startsAt = new Date();
    const endsAt = new Date(startsAt);
    endsAt.setDate(endsAt.getDate() + plan.trialDays);
    return this.trials.save(
      this.trials.create({
        userId: user.id,
        planId: dto.planId,
        startsAt,
        endsAt,
        status: TrialStatus.ACTIVE,
      }),
    );
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
  ): Promise<Subscription> {
    const subscription = await this.subscriptions.findOne({
      where: { id },
      relations: { plan: true },
    });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    if (seesEverything(user) || subscription.userId === user.id) {
      return subscription;
    }
    throw new NotFoundException('Subscription not found');
  }

  // ── Managed units capture ────────────────────────────────────

  private async countOccupiedUnits(ownerId: string): Promise<number> {
    const qb = this.units
      .createQueryBuilder('unit')
      .innerJoin(
        Property,
        'property',
        'property.id = unit.property_id AND property.owner_id = :ownerId',
        { ownerId },
      )
      .andWhere('unit.status = :status', { status: UnitStatus.OCCUPIED });
    return qb.getCount();
  }

  async syncManagedUnitsForOwner(ownerId: string): Promise<void> {
    const count = await this.countOccupiedUnits(ownerId);
    const activeSubs = await this.subscriptions.find({
      where: { userId: ownerId },
      order: { createdAt: 'DESC' },
    });
    if (activeSubs.length === 0) return;
    await Promise.all(
      activeSubs.map((s) =>
        this.subscriptions.update({ id: s.id }, { managedUnits: count }),
      ),
    );
  }
}
