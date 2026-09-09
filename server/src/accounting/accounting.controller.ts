import { Controller, Get, Post } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';

@Controller('ledger')
export class AccountingController {
  constructor(private readonly accounting: AccountingService) {}

  @Get('accounts')
  listAccounts(@CurrentUser() _user: AuthJwtPayload) {
    return this.accounting.listAccounts();
  }

  @Get('transactions')
  listTransactions(@CurrentUser() _user: AuthJwtPayload) {
    return this.accounting.listTransactions();
  }

  @Post('reconciliation-check')
  reconcile(@CurrentUser() _user: AuthJwtPayload) {
    return this.accounting.reconcile();
  }
}
