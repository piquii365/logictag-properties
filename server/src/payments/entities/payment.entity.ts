import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Lease } from '../../leases/entities/lease.entity';
import { User } from '../../users/entities/user.entity';
import {
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
} from '../../common/enums/billing.enum';

@Entity('payments')
export class Payment extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ length: 32 })
  merchantReference!: string;

  @Index()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Index()
  @Column({ type: 'uuid', name: 'lease_id', nullable: true })
  leaseId!: string | null;

  @ManyToOne(() => Lease, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'lease_id' })
  lease!: Lease | null;

  @Column({ type: 'bigint' })
  amountMinor!: string;

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency!: string;

  @Column({ type: 'bigint', default: 0 })
  allocatedMinor!: string;

  @Column({ length: 32 })
  method!: PaymentMethod;

  @Column({ type: 'varchar', length: 32, nullable: true })
  provider!: PaymentProvider | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  providerReference!: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  pollUrl!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  providerMethodCode!: string | null;

  @Column({ length: 16, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @Column({ type: 'text', nullable: true })
  failureReason!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column({ type: 'uuid', name: 'reverses_payment_id', nullable: true })
  reversesPaymentId!: string | null;

  @ManyToOne(() => Payment, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reverses_payment_id' })
  reversesPayment!: Payment | null;

  @Column({ type: 'jsonb', nullable: true })
  rawResponse!: Record<string, unknown> | null;

  /** URL of an uploaded proof-of-payment document (tenant or manager). */
  @Column({ type: 'varchar', length: 512, name: 'proof_url', nullable: true })
  proofUrl!: string | null;

  @Column({ type: 'uuid', name: 'created_by_user_id', nullable: true })
  createdByUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy!: User | null;
}
