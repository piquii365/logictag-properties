import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';
import { Unit } from '../../properties/entities/unit.entity';
import { User } from '../../users/entities/user.entity';
import { LeaseStatus, RentFrequency } from '../../common/enums/leasing.enum';

@Entity('leases')
export class Lease extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'unit_id' })
  unitId!: string;

  @ManyToOne(() => Unit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id' })
  unit!: Unit;

  @Index({ unique: true })
  @Column({ length: 32 })
  reference!: string;

  @Column({ type: 'date' })
  startDate!: string;

  @Column({ type: 'date', nullable: true })
  endDate!: string | null;

  @Column({ type: 'bigint' })
  rentAmountMinor!: string;

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency!: string;

  @Column({ length: 16 })
  frequency!: RentFrequency;

  @Column({ type: 'smallint', default: 1 })
  rentDueDay!: number;

  @Column({ type: 'bigint', default: 0 })
  depositMinor!: string;

  @Column({ length: 16, default: LeaseStatus.DRAFT })
  status!: LeaseStatus;

  @Column({ type: 'timestamptz', nullable: true })
  activatedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  terminatedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  terminationReason!: string | null;

  @Column({ type: 'uuid', name: 'created_by_user_id', nullable: true })
  createdByUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy!: User | null;
}
