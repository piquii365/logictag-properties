import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';

@Entity('ledger_transactions')
export class LedgerTransaction extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ length: 32 })
  transactionNumber!: string;

  @Index()
  @Column({ type: 'varchar', length: 32 })
  entityType!: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  entityId!: string | null;

  @Index()
  @Column({ type: 'date' })
  transactionDate!: string;

  @Column({ length: 255 })
  description!: string;

  @Column({ type: 'uuid', nullable: true })
  createdBy!: string | null;
}
