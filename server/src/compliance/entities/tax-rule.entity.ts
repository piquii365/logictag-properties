import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';

@Entity('tax_rules')
export class TaxRule extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ length: 32 })
  code!: string;

  @Index()
  @Column({ type: 'varchar', length: 32, name: 'tax_type' })
  taxType!: string;

  @Column({ length: 16, default: 'ZW' })
  jurisdiction!: string;

  @Column({ type: 'numeric', precision: 7, scale: 4 })
  rate!: string;

  @Column({ type: 'varchar', length: 64, name: 'calculation_method' })
  calculationMethod!: string;

  @Index()
  @Column({ type: 'date', name: 'effective_from' })
  effectiveFrom!: string;

  @Column({ type: 'date', name: 'effective_to', nullable: true })
  effectiveTo!: string | null;

  @Column({ type: 'varchar', length: 255, name: 'source_name' })
  sourceName!: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'source_reference',
    nullable: true,
  })
  sourceReference!: string | null;

  @Column({ type: 'int' })
  version!: number;

  @Index()
  @Column({ default: true })
  active!: boolean;
}
