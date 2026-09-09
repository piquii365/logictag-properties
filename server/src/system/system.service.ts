import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Property } from '../properties/entities/property.entity';
import { Unit } from '../properties/entities/unit.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity';
import { SubscriptionPayment } from '../subscriptions/entities/subscription-payment.entity';
import { Payment } from '../payments/entities/payment.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

@Injectable()
export class SystemService {
  constructor(private readonly dataSource: DataSource) {}

  /** Aggregate counts across the core tables, plus lightweight runtime info.
   * Admin-only (enforced in the controller). */
  async overview() {
    const count = async (entity: new () => unknown) =>
      this.dataSource.getRepository(entity).count();

    const [
      users,
      properties,
      units,
      subscriptions,
      plans,
      subPayments,
      payments,
      auditLogs,
    ] = await Promise.all([
      count(User),
      count(Property),
      count(Unit),
      count(Subscription),
      count(SubscriptionPlan),
      count(SubscriptionPayment),
      count(Payment),
      count(AuditLog),
    ]);

    return {
      counts: {
        users,
        properties,
        units,
        subscriptions,
        subscriptionPlans: plans,
        subscriptionPayments: subPayments,
        payments,
        auditLogs,
      },
      runtime: {
        node: process.version,
        platform: process.platform,
        uptimeSeconds: Math.round(process.uptime()),
        memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        env: process.env.NODE_ENV ?? 'development',
        now: new Date().toISOString(),
      },
    };
  }
}
