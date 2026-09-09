import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Expense, ExpenseStatus } from './entities/expense.entity';
import { Property } from '../properties/entities/property.entity';
import { Unit } from '../properties/entities/unit.entity';
import { AccountingService } from '../accounting/accounting.service';
import { LedgerAccountType } from '../accounting/entities/ledger-account.entity';
import { UserRole } from '../auth/enums/role.enum';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { OWNER_ROLES, seesEverything } from '../common/access';
import { CreateExpenseDto } from './dto/create-expense.dto';

const isBackOffice = (user: AuthJwtPayload) =>
  seesEverything(user) || user.role === UserRole.STAFF;

@Injectable()
export class ExpensesService {
  private readonly expenses: Repository<Expense>;
  private readonly properties: Repository<Property>;
  private readonly units: Repository<Unit>;

  constructor(
    dataSource: DataSource,
    private readonly accounting: AccountingService,
  ) {
    this.expenses = dataSource.getRepository(Expense);
    this.properties = dataSource.getRepository(Property);
    this.units = dataSource.getRepository(Unit);
  }

  async create(user: AuthJwtPayload, dto: CreateExpenseDto): Promise<Expense> {
    await this.assertPropertyAccess(user, dto.propertyId, true);
    if (dto.unitId) {
      const unit = await this.units.findOne({ where: { id: dto.unitId } });
      if (!unit || unit.propertyId !== dto.propertyId) {
        throw new BadRequestException('Unit does not belong to the property');
      }
    }
    return this.expenses.save(
      this.expenses.create({
        ...dto,
        unitId: dto.unitId ?? null,
        vendorId: dto.vendorId ?? null,
        currency: dto.currency ?? 'USD',
        billableToTenant: dto.billableToTenant ?? false,
        invoiceNumber: dto.invoiceNumber ?? null,
        status: ExpenseStatus.DRAFT,
        approvedByUserId: null,
        approvedAt: null,
        reversalReason: null,
        createdByUserId: user.id,
      }),
    );
  }

  async findAll(user: AuthJwtPayload, propertyId?: string): Promise<Expense[]> {
    if (propertyId) {
      await this.assertPropertyAccess(user, propertyId, false);
    }
    if (isBackOffice(user)) {
      return this.expenses.find({
        where: propertyId ? { propertyId } : undefined,
        relations: { vendor: true, unit: true },
        order: { expenseDate: 'DESC' },
      });
    }
    if (OWNER_ROLES.includes(user.role)) {
      return this.expenses
        .createQueryBuilder('expense')
        .innerJoinAndSelect('expense.property', 'property')
        .leftJoinAndSelect('expense.vendor', 'vendor')
        .leftJoinAndSelect('expense.unit', 'unit')
        .where('property.owner_id = :ownerId', { ownerId: user.id })
        .andWhere(propertyId ? 'expense.property_id = :propertyId' : '1=1', {
          propertyId,
        })
        .orderBy('expense.expense_date', 'DESC')
        .getMany();
    }
    throw new ForbiddenException('Not allowed to view expenses');
  }

  async findOne(user: AuthJwtPayload, id: string): Promise<Expense> {
    const expense = await this.expenses.findOne({
      where: { id },
      relations: { property: true, vendor: true, unit: true },
    });
    if (!expense || !(await this.canView(user, expense))) {
      throw new NotFoundException('Expense not found');
    }
    return expense;
  }

  async approve(user: AuthJwtPayload, id: string): Promise<Expense> {
    const expense = await this.findManageable(user, id);
    if (
      expense.status !== ExpenseStatus.DRAFT &&
      expense.status !== ExpenseStatus.SUBMITTED
    ) {
      throw new BadRequestException(
        'Only draft or submitted expenses can be approved',
      );
    }
    expense.status = ExpenseStatus.APPROVED;
    expense.approvedByUserId = user.id;
    expense.approvedAt = new Date();
    const saved = await this.expenses.save(expense);
    await this.accounting.createTransaction(
      'expense',
      saved.id,
      `Approved expense: ${saved.description}`,
      [
        {
          accountCode: '6000',
          accountName: 'Property expenses',
          accountType: LedgerAccountType.EXPENSE,
          debitMinor: saved.amountMinor,
        },
        {
          accountCode: '2000',
          accountName: 'Accounts payable',
          accountType: LedgerAccountType.LIABILITY,
          creditMinor: saved.amountMinor,
        },
      ],
      user.id,
    );
    return saved;
  }

  async reverse(
    user: AuthJwtPayload,
    id: string,
    reason: string,
  ): Promise<Expense> {
    const expense = await this.findManageable(user, id);
    if (
      expense.status !== ExpenseStatus.APPROVED &&
      expense.status !== ExpenseStatus.PAID
    ) {
      throw new BadRequestException(
        'Only approved or paid expenses can be reversed',
      );
    }
    expense.status = ExpenseStatus.REVERSED;
    expense.reversalReason = reason;
    const saved = await this.expenses.save(expense);
    await this.accounting.createTransaction(
      'expense_reversal',
      saved.id,
      `Reversed expense: ${saved.description}`,
      [
        {
          accountCode: '2000',
          accountName: 'Accounts payable',
          accountType: LedgerAccountType.LIABILITY,
          debitMinor: saved.amountMinor,
        },
        {
          accountCode: '6000',
          accountName: 'Property expenses',
          accountType: LedgerAccountType.EXPENSE,
          creditMinor: saved.amountMinor,
        },
      ],
      user.id,
    );
    return saved;
  }

  async byCategory(user: AuthJwtPayload, propertyId: string) {
    await this.assertPropertyAccess(user, propertyId, false);
    return this.expenses
      .createQueryBuilder('expense')
      .select('expense.category', 'category')
      .addSelect('SUM(expense.amount_minor)', 'amountMinor')
      .where('expense.property_id = :propertyId', { propertyId })
      .andWhere('expense.status IN (:...statuses)', {
        statuses: [ExpenseStatus.APPROVED, ExpenseStatus.PAID],
      })
      .groupBy('expense.category')
      .orderBy('amountMinor', 'DESC')
      .getRawMany();
  }

  private async canView(user: AuthJwtPayload, expense: Expense) {
    if (isBackOffice(user)) return true;
    return (
      OWNER_ROLES.includes(user.role) && expense.property.ownerId === user.id
    );
  }

  private async findManageable(user: AuthJwtPayload, id: string) {
    const expense = await this.findOne(user, id);
    if (!isBackOffice(user) && !OWNER_ROLES.includes(user.role)) {
      throw new ForbiddenException('Not allowed to manage expenses');
    }
    return expense;
  }

  private async assertPropertyAccess(
    user: AuthJwtPayload,
    propertyId: string,
    manage: boolean,
  ) {
    const property = await this.properties.findOne({
      where: { id: propertyId },
    });
    if (!property) throw new NotFoundException('Property not found');
    if (isBackOffice(user)) return property;
    if (!OWNER_ROLES.includes(user.role) || property.ownerId !== user.id) {
      throw new ForbiddenException(
        manage
          ? 'You do not manage this property'
          : 'You cannot view this property',
      );
    }
    return property;
  }
}
