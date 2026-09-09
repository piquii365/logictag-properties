import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';
import { Subscription } from './subscription.entity';

export type SubscriptionPaymentStatus = 'pending' | 'succeeded' | 'failed';

@Entity('subscription_payments')
export class SubscriptionPayment extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'subscription_id' })
  subscriptionId!: string;

  @ManyToOne(() => Subscription, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_id' })
  subscription!: Subscription;

  @Column({ type: 'bigint' })
  amountMinor!: string;

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency!: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  provider!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  providerReference!: string | null;

  @Column({ length: 16 })
  status!: SubscriptionPaymentStatus;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  providerResponse!: Record<string, unknown> | null;
}
