import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LedgerAccount } from './ledger-account.entity';
import { LedgerTransaction } from './ledger-transaction.entity';

@Entity('ledger_entries')
@Check('debit_non_negative', 'debit >= 0')
@Check('credit_non_negative', 'credit >= 0')
@Check(
  'one_side_only',
  '(debit = 0 AND credit > 0) OR (credit = 0 AND debit > 0)',
)
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'ledger_transaction_id' })
  ledgerTransactionId!: string;

  @ManyToOne(() => LedgerTransaction, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ledger_transaction_id' })
  ledgerTransaction!: LedgerTransaction;

  @Index()
  @Column({ type: 'uuid', name: 'account_id' })
  accountId!: string;

  @ManyToOne(() => LedgerAccount, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'account_id' })
  account!: LedgerAccount;

  @Column({ type: 'bigint', default: 0 })
  debit!: string;

  @Column({ type: 'bigint', default: 0 })
  credit!: string;
}
