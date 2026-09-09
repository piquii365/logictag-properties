import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';
import { BillingInterval } from '../../common/enums/subscriptions.enum';

@Entity('subscription_plans')
export class SubscriptionPlan extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ length: 80 })
  code!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'bigint' })
  amountMinor!: string;

  @Column({ type: 'bigint', nullable: true })
  pricePerUnitMinor!: string | null;

  @Column({ type: 'int', nullable: true })
  minimumUnits!: number | null;

  @Column({ type: 'int', nullable: true })
  maximumUnits!: number | null;

  @Column({ default: false })
  customPricing!: boolean;

  @Column({ type: 'jsonb', default: {} })
  notificationSettings!: Record<string, unknown>;

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency!: string;

  @Column({ length: 16 })
  billingInterval!: BillingInterval;

  @Column({ type: 'int', nullable: true })
  trialDays!: number | null;

  @Column({ type: 'jsonb', default: {} })
  features!: Record<string, unknown>;

  @Column({ default: true })
  isActive!: boolean;
}
