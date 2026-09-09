import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';

@Entity('tax_return_lines')
export class TaxReturnLine extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'tax_return_id' })
  taxReturnId!: string;

  @Column({ type: 'varchar', length: 32, name: 'line_type' })
  lineType!: string;

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @Column({ type: 'bigint' })
  amount!: string;

  @Column({ type: 'varchar', length: 32, name: 'entity_type', nullable: true })
  entityType!: string | null;

  @Column({ type: 'uuid', name: 'entity_id', nullable: true })
  entityId!: string | null;
}
