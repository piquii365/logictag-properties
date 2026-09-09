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
import { Service } from './service.entity';

export type VendorRateType = 'hourly' | 'fixed' | 'quote_only';

@Entity('vendor_services')
@Unique(['vendorId', 'serviceId'])
export class VendorService extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'vendor_id' })
  vendorId!: string;

  @ManyToOne(() => Vendor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendor_id' })
  vendor!: Vendor;

  @Index()
  @Column({ type: 'uuid', name: 'service_id' })
  serviceId!: string;

  @ManyToOne(() => Service, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service!: Service;

  @Column({ type: 'varchar', length: 16, nullable: true })
  rateType!: VendorRateType | null;

  @Column({ type: 'bigint', nullable: true })
  rateMinor!: string | null;

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency!: string;
}
