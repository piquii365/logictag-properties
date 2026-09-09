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
import { SubscribeDto } from './dto/subscribe.dto';
import { StartTrialDto } from './dto/start-trial.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { seesEverything } from '../common/access';
import { NotificationsService } from '../notifications/notifications.service';
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

  createPlan(
    user: AuthJwtPayload,
    dto: CreateSubscriptionPlanDto,
  ): Promise<SubscriptionPlan> {
    this.assertAdmin(user);
    return this.plans.save(
      this.plans.create({
        ...dto,
        notificationSettings: dto.notificationSettings ?? {},
      }),
    );
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
    return saved;
  }

  // ── Subscriptions ─────────────────────────────────────────────

  async findAll(user: AuthJwtPayload): Promise<Subscription[]> {
    if (seesEverything(user)) {
      return this.subscriptions.find({ order: { createdAt: 'DESC' } });
    }
    return this.subscriptions.find({ where: { userId: user.id } });
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

    return this.subscriptions.save(
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
  }

  async cancel(user: AuthJwtPayload, id: string): Promise<Subscription> {
    const subscription = await this.findManageable(user, id);
    subscription.status = SubscriptionStatus.CANCELED;
    subscription.canceledAt = new Date();
    return this.subscriptions.save(subscription);
  }

  async resume(user: AuthJwtPayload, id: string): Promise<Subscription> {
    const subscription = await this.findManageable(user, id);
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.canceledAt = null;
    subscription.currentPeriodStart = new Date();
    return this.subscriptions.save(subscription);
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
    return this.subscriptions.save(subscription);
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
    return this.payments.save(payment);
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
    const subscription = await this.subscriptions.findOne({ where: { id } });
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
