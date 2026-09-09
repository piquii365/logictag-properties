import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Raw inbound events from a payment provider, kept for audit/replay.
 * ponytail: no public receiver route is wired up yet — a real webhook
 * endpoint needs provider signature verification before it can be public. */
@Entity('payment_webhook_events')
export class PaymentWebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 32 })
  provider!: string;

  @Index({ unique: true })
  @Column({ length: 64 })
  payloadHash!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  providerReference!: string | null;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  headers!: Record<string, unknown> | null;

  @Column({ type: 'timestamptz', nullable: true })
  processedAt!: Date | null;

  @Column({ length: 32 })
  outcome!: string;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @Column({ type: 'timestamptz' })
  receivedAt!: Date;
}
