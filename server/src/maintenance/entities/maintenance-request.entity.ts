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
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { Service } from '../../vendors/entities/service.entity';
import { MaintenanceQuote } from './maintenance-quote.entity';
import {
  MaintenancePriority,
  MaintenanceStatus,
} from '../../common/enums/maintenance.enum';

@Entity('maintenance_requests')
export class MaintenanceRequest extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ length: 32 })
  reference!: string;

  @Index()
  @Column({ type: 'uuid', name: 'unit_id' })
  unitId!: string;

  @ManyToOne(() => Unit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_id' })
  unit!: Unit;

  @Column({ type: 'uuid', name: 'tenant_id', nullable: true })
  tenantId!: string | null;

  @ManyToOne(() => Tenant, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant | null;

  @Column({ type: 'uuid', name: 'reported_by_user_id' })
  reportedByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reported_by_user_id' })
  reportedBy!: User;

  @Column({ type: 'uuid', name: 'assigned_staff_id', nullable: true })
  assignedStaffId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_staff_id' })
  assignedStaff!: User | null;

  @Index()
  @Column({ type: 'uuid', name: 'vendor_id', nullable: true })
  vendorId!: string | null;

  @ManyToOne(() => Vendor, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'vendor_id' })
  vendor!: Vendor | null;

  @Column({ type: 'uuid', name: 'accepted_quote_id', nullable: true })
  acceptedQuoteId!: string | null;

  @ManyToOne(() => MaintenanceQuote, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'accepted_quote_id' })
  acceptedQuote!: MaintenanceQuote | null;

  @Column({ length: 180 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'uuid', name: 'category_service_id', nullable: true })
  categoryServiceId!: string | null;

  @ManyToOne(() => Service, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'category_service_id' })
  categoryService!: Service | null;

  @Column({ length: 16 })
  priority!: MaintenancePriority;

  @Index()
  @Column({ length: 16, default: MaintenanceStatus.OPEN })
  status!: MaintenanceStatus;

  @Column({ type: 'timestamptz' })
  openedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt!: Date | null;
}
