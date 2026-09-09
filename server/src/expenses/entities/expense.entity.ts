import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';
import { Property } from '../../properties/entities/property.entity';
import { Unit } from '../../properties/entities/unit.entity';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { User } from '../../users/entities/user.entity';

export enum ExpenseStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  PAID = 'paid',
  REVERSED = 'reversed',
}

export enum ExpenseCategory {
  MAINTENANCE = 'maintenance',
  REPAIRS = 'repairs',
  SECURITY = 'security',
  CLEANING = 'cleaning',
  UTILITIES = 'utilities',
  INSURANCE = 'insurance',
  MANAGEMENT_FEE = 'management_fee',
  LOCAL_AUTHORITY = 'local_authority',
  TAX = 'tax',
  LEGAL = 'legal',
  OTHER = 'other',
}

@Entity('expenses')
export class Expense extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'property_id' })
  propertyId!: string;

  @Column({ type: 'uuid', name: 'unit_id', nullable: true })
  unitId!: string | null;

  @Column({ type: 'uuid', name: 'vendor_id', nullable: true })
  vendorId!: string | null;

  @Column({ length: 32 })
  category!: ExpenseCategory;

  @Column({ length: 255 })
  description!: string;

  @Column({ type: 'bigint' })
  amountMinor!: string;

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency!: string;

  @Index()
  @Column({ type: 'date', name: 'expense_date' })
  expenseDate!: string;

  @Column({ type: 'boolean', default: false })
  billableToTenant!: boolean;

  @Column({ type: 'varchar', length: 32, nullable: true })
  invoiceNumber!: string | null;

  @Index()
  @Column({ length: 16, default: ExpenseStatus.DRAFT })
  status!: ExpenseStatus;

  @Column({ type: 'uuid', name: 'approved_by_user_id', nullable: true })
  approvedByUserId!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  reversalReason!: string | null;

  @Column({ type: 'uuid', name: 'created_by_user_id', nullable: true })
  createdByUserId!: string | null;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @ManyToOne(() => Unit, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'unit_id' })
  unit!: Unit | null;

  @ManyToOne(() => Vendor, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'vendor_id' })
  vendor!: Vendor | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'approved_by_user_id' })
  approvedBy!: User | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy!: User | null;
}
