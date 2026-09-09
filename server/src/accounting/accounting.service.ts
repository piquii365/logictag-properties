import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import {
  LedgerAccount,
  LedgerAccountType,
} from './entities/ledger-account.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { LedgerTransaction } from './entities/ledger-transaction.entity';

export interface LedgerEntryInput {
  accountCode: string;
  accountName: string;
  accountType: LedgerAccountType;
  debitMinor?: string;
  creditMinor?: string;
}

@Injectable()
export class AccountingService {
  private readonly accounts: Repository<LedgerAccount>;
  private readonly transactions: Repository<LedgerTransaction>;
  private readonly entries: Repository<LedgerEntry>;

  constructor(private readonly dataSource: DataSource) {
    this.accounts = dataSource.getRepository(LedgerAccount);
    this.transactions = dataSource.getRepository(LedgerTransaction);
    this.entries = dataSource.getRepository(LedgerEntry);
  }

  async listAccounts(): Promise<LedgerAccount[]> {
    return this.accounts.find({
      where: { status: 'active' },
      order: { code: 'ASC' },
    });
  }

  async listTransactions(): Promise<LedgerTransaction[]> {
    return this.transactions.find({
      order: { transactionDate: 'DESC', createdAt: 'DESC' },
      take: 100,
    });
  }

  async createTransaction(
    entityType: string,
    entityId: string | null,
    description: string,
    entries: LedgerEntryInput[],
    createdBy: string | null = null,
  ): Promise<LedgerTransaction> {
    if (entries.length < 2) {
      throw new BadRequestException(
        'A ledger transaction needs at least two entries',
      );
    }

    const debitTotal = entries.reduce(
      (total, entry) => total + BigInt(entry.debitMinor ?? '0'),
      0n,
    );
    const creditTotal = entries.reduce(
      (total, entry) => total + BigInt(entry.creditMinor ?? '0'),
      0n,
    );
    if (debitTotal <= 0n || debitTotal !== creditTotal) {
      throw new BadRequestException('Ledger debits and credits must balance');
    }

    return this.dataSource.transaction(async (manager) => {
      const transaction = manager.create(LedgerTransaction, {
        transactionNumber: `TX-${randomUUID().replace(/-/g, '').slice(0, 20)}`,
        entityType,
        entityId,
        transactionDate: new Date().toISOString().slice(0, 10),
        description,
        createdBy,
      });
      const savedTransaction = await manager.save(transaction);

      for (const input of entries) {
        const account = await this.getOrCreateAccount(manager, input);
        await manager.save(
          manager.create(LedgerEntry, {
            ledgerTransactionId: savedTransaction.id,
            accountId: account.id,
            debit: input.debitMinor ?? '0',
            credit: input.creditMinor ?? '0',
          }),
        );
      }

      return savedTransaction;
    });
  }

  async recordPaymentAllocation(
    allocationId: string,
    amountMinor: string,
    createdBy: string | null,
  ): Promise<LedgerTransaction> {
    const existing = await this.transactions.findOne({
      where: { entityType: 'payment_allocation', entityId: allocationId },
    });
    if (existing) {
      return existing;
    }

    return this.createTransaction(
      'payment_allocation',
      allocationId,
      `Payment allocation ${allocationId}`,
      [
        {
          accountCode: '1000',
          accountName: 'Cash and bank',
          accountType: LedgerAccountType.ASSET,
          debitMinor: amountMinor,
        },
        {
          accountCode: '1100',
          accountName: 'Tenant receivables',
          accountType: LedgerAccountType.ASSET,
          creditMinor: amountMinor,
        },
      ],
      createdBy,
    );
  }

  async reconcile(): Promise<{
    balanced: boolean;
    debitMinor: string;
    creditMinor: string;
  }> {
    const totals = await this.entries
      .createQueryBuilder('entry')
      .select('COALESCE(SUM(entry.debit), 0)', 'debit')
      .addSelect('COALESCE(SUM(entry.credit), 0)', 'credit')
      .getRawOne<{ debit: string; credit: string }>();

    const debitMinor = totals?.debit ?? '0';
    const creditMinor = totals?.credit ?? '0';
    return {
      balanced: BigInt(debitMinor) === BigInt(creditMinor),
      debitMinor,
      creditMinor,
    };
  }

  private async getOrCreateAccount(
    manager: EntityManager,
    input: LedgerEntryInput,
  ): Promise<LedgerAccount> {
    const repository = manager.getRepository(LedgerAccount);
    const existing = await repository.findOne({
      where: { code: input.accountCode },
    });
    if (existing) {
      return existing;
    }
    return repository.save(
      repository.create({
        code: input.accountCode,
        name: input.accountName,
        type: input.accountType,
        accountType: input.accountName.toLowerCase().replace(/\s+/g, '_'),
        status: 'active',
        organizationId: null,
      }),
    );
  }
}
