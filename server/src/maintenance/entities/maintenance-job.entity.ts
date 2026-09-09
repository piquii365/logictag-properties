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
import { MaintenanceQuote } from './maintenance-quote.entity';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { JobStatus } from '../../common/enums/maintenance.enum';

@Entity('maintenance_jobs')
export class MaintenanceJob extends TimestampEntity {
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

  @Column({ type: 'uuid', name: 'quote_id', nullable: true })
  quoteId!: string | null;

  @ManyToOne(() => MaintenanceQuote, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'quote_id' })
  quote!: MaintenanceQuote | null;

  @Column({ type: 'bigint' })
  agreedCostMinor!: string;

  @Column({ type: 'bigint', nullable: true })
  finalCostMinor!: string | null;

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency!: string;

  @Column({ length: 16 })
  status!: JobStatus;

  @Column({ type: 'text', nullable: true })
  declineReason!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  assignedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  acceptedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  completionNotes!: string | null;
}
