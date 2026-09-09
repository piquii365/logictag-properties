import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { VendorStatus } from '../../common/enums/maintenance.enum';

@Entity('vendors')
export class Vendor extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @Column({ length: 160 })
  name!: string;

  @Column({ length: 160 })
  contactName!: string;

  @Column({ length: 32 })
  contactPhone!: string;

  @Column({ length: 255 })
  contactEmail!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ length: 120 })
  city!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  suburb!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Index()
  @Column({ length: 16, default: VendorStatus.PENDING })
  status!: VendorStatus;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt!: Date | null;

  @Column({ type: 'uuid', name: 'approved_by_user_id', nullable: true })
  approvedByUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'approved_by_user_id' })
  approvedBy!: User | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason!: string | null;

  @Column({ type: 'numeric', precision: 3, scale: 2, nullable: true })
  rating!: string | null;

  @Column({ type: 'int', default: 0 })
  ratingsCount!: number;

  @Column({ type: 'int', default: 0 })
  jobsCompleted!: number;
}
