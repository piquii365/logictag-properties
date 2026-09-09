import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';
import { Vendor } from './vendor.entity';
import { MaintenanceJob } from '../../maintenance/entities/maintenance-job.entity';
import { User } from '../../users/entities/user.entity';

@Entity('vendor_ratings')
@Unique(['maintenanceJobId'])
export class VendorRating extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'vendor_id' })
  vendorId!: string;

  @ManyToOne(() => Vendor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendor_id' })
  vendor!: Vendor;

  @Column({ type: 'uuid', name: 'maintenance_job_id' })
  maintenanceJobId!: string;

  @ManyToOne(() => MaintenanceJob, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'maintenance_job_id' })
  maintenanceJob!: MaintenanceJob;

  @Column({ type: 'uuid', name: 'rated_by_user_id' })
  ratedByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'rated_by_user_id' })
  ratedBy!: User;

  @Column({ type: 'smallint' })
  score!: number;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;
}
