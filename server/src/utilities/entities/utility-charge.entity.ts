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
import { Unit } from '../../properties/entities/unit.entity';
import { Utility } from './utility.entity';
import { Meter } from './meter.entity';
import { User } from '../../users/entities/user.entity';
import { ChargeStatus } from '../../common/enums/billing.enum';

@Entity('utility_charges')
export class UtilityCharge extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'uuid', name: 'lease_id', nullable: true })
  leaseId!: string | null;

  @ManyToOne(() => Lease, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'lease_id' })
  lease!: Lease | null;

  @Index()
  @Column({ type: 'uuid', name: 'unit_id' })
  unitId!: string;

  @ManyToOne(() => Unit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_id' })
  unit!: Unit;

  @Column({ type: 'uuid', name: 'utility_id' })
  utilityId!: string;

  @ManyToOne(() => Utility, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'utility_id' })
  utility!: Utility;

  @Column({ type: 'uuid', name: 'meter_id', nullable: true })
  meterId!: string | null;

  @ManyToOne(() => Meter, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'meter_id' })
  meter!: Meter | null;

  @Column({ type: 'date' })
  periodStart!: string;

  @Column({ type: 'date' })
  periodEnd!: string;

  @Column({ type: 'date' })
  dueDate!: string;

  @Column({ type: 'numeric', precision: 14, scale: 3, nullable: true })
  consumption!: string | null;

  @Column({ type: 'bigint', nullable: true })
  rateMinor!: string | null;

  @Column({ type: 'bigint', default: 0 })
  amountMinor!: string;

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency!: string;

  @Column({ type: 'bigint', default: 0 })
  allocatedMinor!: string;

  @Column({ length: 16, default: ChargeStatus.OUTSTANDING })
  status!: ChargeStatus;

  @Column({ type: 'text', nullable: true })
  blockedReason!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  voidedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  voidReason!: string | null;

  @Column({ type: 'uuid', name: 'voided_by_user_id', nullable: true })
  voidedByUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'voided_by_user_id' })
  voidedBy!: User | null;

  @Column({ type: 'uuid', name: 'created_by_user_id', nullable: true })
  createdByUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy!: User | null;
}
