import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';
import { Payment } from './payment.entity';
import { User } from '../../users/entities/user.entity';
import type { AdjustableType } from '../../billing/entities/charge-adjustment.entity';

@Entity('payment_allocations')
export class PaymentAllocation extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'payment_id' })
  paymentId!: string;

  @ManyToOne(() => Payment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_id' })
  payment!: Payment;

  @Column({ length: 24 })
  allocatableType!: AdjustableType;

  @Index()
  @Column({ type: 'uuid' })
  allocatableId!: string;

  @Column({ type: 'bigint' })
  amountMinor!: string;

  @Column({ type: 'timestamptz' })
  allocatedAt!: Date;

  @Column({ type: 'uuid', name: 'created_by_user_id', nullable: true })
  createdByUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy!: User | null;
}
