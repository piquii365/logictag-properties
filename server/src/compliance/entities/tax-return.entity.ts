import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';

@Entity('tax_returns')
export class TaxReturn extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'uuid', name: 'zimra_profile_id' })
  zimraProfileId!: string;

  @Column({ type: 'varchar', length: 32, name: 'tax_type' })
  taxType!: string;

  @Column({ type: 'date', name: 'tax_period_start' })
  taxPeriodStart!: string;

  @Column({ type: 'date', name: 'tax_period_end' })
  taxPeriodEnd!: string;

  @Index()
  @Column({ type: 'varchar', length: 16, default: 'draft' })
  status!: string;

  @Column({ type: 'bigint', name: 'gross_rental_income' })
  grossRentalIncome!: string;

  @Column({ type: 'bigint', name: 'allowable_deductions' })
  allowableDeductions!: string;

  @Column({ type: 'bigint', name: 'net_income' })
  netIncome!: string;

  @Column({ type: 'bigint', name: 'tax_due' })
  taxDue!: string;

  @Column({ type: 'bigint', name: 'tax_paid', default: 0 })
  taxPaid!: string;

  @Column({ type: 'bigint', name: 'tax_balance' })
  taxBalance!: string;

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency!: string;

  @Column({ type: 'timestamptz', name: 'generated_at' })
  generatedAt!: Date;
}
