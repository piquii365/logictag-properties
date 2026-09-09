import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';
import { Vendor } from './vendor.entity';

@Entity('vendor_service_areas')
export class VendorServiceArea extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'vendor_id' })
  vendorId!: string;

  @ManyToOne(() => Vendor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendor_id' })
  vendor!: Vendor;

  @Column({ length: 120 })
  city!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  suburb!: string | null;
}
