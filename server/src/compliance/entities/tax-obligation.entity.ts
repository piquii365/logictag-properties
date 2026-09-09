import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';
import { TaxRule } from './tax-rule.entity';

@Entity('tax_obligations')
export class TaxObligation extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'uuid', name: 'zimra_profile_id' })
  zimraProfileId!: string;

  @Index()
  @Column({ type: 'varchar', length: 32, name: 'tax_type' })
  taxType!: string;

  @Column({ type: 'varchar', length: 32, name: 'liable_party_type' })
  liablePartyType!: string;

  @Column({ type: 'uuid', name: 'liable_party_id', nullable: true })
  liablePartyId!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'property_id' })
  propertyId!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'lease_id' })
  leaseId!: string | null;

  @Column({ type: 'date', name: 'tax_period_start' })
  taxPeriodStart!: string;

  @Column({ type: 'date', name: 'tax_period_end' })
  taxPeriodEnd!: string;

  @Column({ type: 'bigint', name: 'taxable_amount' })
  taxableAmount!: string;

  @Column({ type: 'numeric', precision: 7, scale: 4, name: 'tax_rate' })
  taxRate!: string;

  @Column({ type: 'bigint', name: 'tax_amount' })
  taxAmount!: string;

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency!: string;

  @Column({ type: 'date', name: 'due_date' })
  dueDate!: string;

  @Index()
  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status!: string;

  @Column({ type: 'uuid', name: 'rule_version_id' })
  ruleVersionId!: string;

  @ManyToOne(() => TaxRule, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'rule_version_id' })
  rule!: TaxRule;
}
