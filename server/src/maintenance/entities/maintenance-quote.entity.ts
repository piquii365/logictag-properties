import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';
import { MaintenanceRequest } from './maintenance-request.entity';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { User } from '../../users/entities/user.entity';
import { QuoteStatus } from '../../common/enums/maintenance.enum';

@Entity('maintenance_quotes')
export class MaintenanceQuote extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'maintenance_request_id' })
  maintenanceRequestId!: string;

  @ManyToOne(() => MaintenanceRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'maintenance_request_id' })
  maintenanceRequest!: MaintenanceRequest;

  @Index()
  @Column({ type: 'uuid', name: 'vendor_id' })
  vendorId!: string;

  @ManyToOne(() => Vendor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendor_id' })
  vendor!: Vendor;

  @Column({ type: 'bigint' })
  amountMinor!: string;

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'smallint', nullable: true })
  estimatedDays!: number | null;

  @Column({ type: 'date' })
  validUntil!: string;

  @Column({ length: 16, default: QuoteStatus.REQUESTED })
  status!: QuoteStatus;

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  respondedAt!: Date | null;

  @Column({ type: 'uuid', name: 'responded_by_user_id', nullable: true })
  respondedByUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'responded_by_user_id' })
  respondedBy!: User | null;
}
