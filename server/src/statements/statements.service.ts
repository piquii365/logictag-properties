import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Property } from '../properties/entities/property.entity';
import { RentCharge } from '../billing/entities/rent-charge.entity';
import { PaymentAllocation } from '../payments/entities/payment-allocation.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Expense, ExpenseStatus } from '../expenses/entities/expense.entity';
import { OWNER_ROLES, seesEverything } from '../common/access';
import { UserRole } from '../auth/enums/role.enum';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';

const isBackOffice = (user: AuthJwtPayload) =>
  seesEverything(user) || user.role === UserRole.STAFF;

export interface OwnerStatement {
  propertyId: string;
  month: string;
  currency: string;
  rentCollectedMinor: string;
  totalIncomeMinor: string;
  maintenanceExpensesMinor: string;
  utilityExpensesMinor: string;
  otherExpensesMinor: string;
  totalExpensesMinor: string;
  netOwnerIncomeMinor: string;
  components: {
    charges: RentCharge[];
    expenses: Expense[];
  };
}

@Injectable()
export class StatementsService {
  private readonly properties: Repository<Property>;
  private readonly charges: Repository<RentCharge>;
  private readonly allocations: Repository<PaymentAllocation>;
  private readonly payments: Repository<Payment>;
  private readonly expenses: Repository<Expense>;

  constructor(dataSource: DataSource) {
    this.properties = dataSource.getRepository(Property);
    this.charges = dataSource.getRepository(RentCharge);
    this.allocations = dataSource.getRepository(PaymentAllocation);
    this.payments = dataSource.getRepository(Payment);
    this.expenses = dataSource.getRepository(Expense);
  }

  async generate(
    user: AuthJwtPayload,
    propertyId: string,
    month: string,
  ): Promise<OwnerStatement> {
    await this.assertAccess(user, propertyId);
    const { start, end } = this.monthBounds(month);
    const charges = await this.charges
      .createQueryBuilder('charge')
      .innerJoinAndSelect('charge.lease', 'lease')
      .innerJoin('lease.unit', 'unit')
      .where('unit.property_id = :propertyId', { propertyId })
      .andWhere('charge.period_start <= :end AND charge.period_end >= :start', {
        start,
        end,
      })
      .orderBy('charge.due_date', 'ASC')
      .getMany();

    const expenses = await this.expenses.find({
      where: { propertyId },
      order: { expenseDate: 'ASC' },
    });
    const approvedExpenses = expenses.filter(
      (expense) =>
        (expense.status === ExpenseStatus.APPROVED ||
          expense.status === ExpenseStatus.PAID) &&
        expense.expenseDate >= start &&
        expense.expenseDate <= end,
    );

    const rentCollected = await this.allocations
      .createQueryBuilder('allocation')
      .innerJoin(Payment, 'payment', 'payment.id = allocation.payment_id')
      .innerJoin(
        RentCharge,
        'charge',
        "allocation.allocatable_type = 'rent_charge' AND charge.id = allocation.allocatable_id",
      )
      .innerJoin('charge.lease', 'lease')
      .innerJoin('lease.unit', 'unit')
      .select('COALESCE(SUM(allocation.amount_minor), 0)', 'amount')
      .where('unit.property_id = :propertyId', { propertyId })
      .andWhere('payment.status = :status', { status: 'succeeded' })
      .andWhere(
        'allocation.allocated_at >= :start AND allocation.allocated_at < :next',
        {
          start,
          next: this.nextMonth(end),
        },
      )
      .getRawOne<{ amount: string }>();

    const income = BigInt(rentCollected?.amount ?? '0');
    const maintenance = this.sumCategory(approvedExpenses, [
      'maintenance',
      'repairs',
    ]);
    const utilities = this.sumCategory(approvedExpenses, ['utilities']);
    const totalExpenses = approvedExpenses.reduce(
      (total, expense) => total + BigInt(expense.amountMinor),
      0n,
    );
    return {
      propertyId,
      month,
      currency: approvedExpenses[0]?.currency ?? charges[0]?.currency ?? 'USD',
      rentCollectedMinor: income.toString(),
      totalIncomeMinor: income.toString(),
      maintenanceExpensesMinor: maintenance.toString(),
      utilityExpensesMinor: utilities.toString(),
      otherExpensesMinor: (totalExpenses - maintenance - utilities).toString(),
      totalExpensesMinor: totalExpenses.toString(),
      netOwnerIncomeMinor: (income - totalExpenses).toString(),
      components: { charges, expenses: approvedExpenses },
    };
  }

  private sumCategory(expenses: Expense[], categories: string[]) {
    return expenses
      .filter((expense) => categories.includes(expense.category))
      .reduce((total, expense) => total + BigInt(expense.amountMinor), 0n);
  }

  private async assertAccess(user: AuthJwtPayload, propertyId: string) {
    const property = await this.properties.findOne({
      where: { id: propertyId },
    });
    if (!property) throw new NotFoundException('Property not found');
    if (isBackOffice(user)) return;
    if (!OWNER_ROLES.includes(user.role) || property.ownerId !== user.id) {
      throw new ForbiddenException('You do not manage this property');
    }
  }

  private monthBounds(month: string) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new ForbiddenException('Month must use YYYY-MM format');
    }
    const [year, monthNumber] = month.split('-').map(Number);
    const start = `${month}-01`;
    const end = new Date(Date.UTC(year, monthNumber, 0))
      .toISOString()
      .slice(0, 10);
    return { start, end };
  }

  private nextMonth(end: string) {
    const date = new Date(`${end}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString();
  }
}
