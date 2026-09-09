import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';

export enum LedgerAccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  INCOME = 'income',
  EXPENSE = 'expense',
}

@Entity('ledger_accounts')
export class LedgerAccount extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'organization_id', nullable: true })
  organizationId!: string | null;

  @Index({ unique: true })
  @Column({ length: 32 })
  code!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 16 })
  type!: LedgerAccountType;

  @Column({ length: 32 })
  accountType!: string;

  @Column({ length: 16, default: 'active' })
  status!: string;
}
