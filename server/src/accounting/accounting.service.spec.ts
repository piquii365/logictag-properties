import { DataSource } from 'typeorm';
import { AccountingService } from './accounting.service';

describe('AccountingService', () => {
  it('treats empty ledger totals as zero and balanced', async () => {
    const entriesRepo = {
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(null),
      })),
    };

    const service = new AccountingService({
      getRepository: jest.fn((entity: unknown) => {
        const name = (entity as { name?: string })?.name;
        if (name === 'LedgerEntry') return entriesRepo;
        return {};
      }),
    } as unknown as DataSource);

    await expect(service.reconcile()).resolves.toEqual({
      balanced: true,
      debitMinor: '0',
      creditMinor: '0',
    });
  });
});
