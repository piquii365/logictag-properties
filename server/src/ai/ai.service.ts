import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AiInsight } from './entities/ai-insight.entity';
import { AiRequestLog } from './entities/ai-request-log.entity';
import { RentCharge } from '../billing/entities/rent-charge.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Expense, ExpenseStatus } from '../expenses/entities/expense.entity';
import { TaxObligation } from '../compliance/entities/tax-obligation.entity';
import { PaymentStatus } from '../common/enums/billing.enum';
import { Lease } from '../leases/entities/lease.entity';
import { MaintenanceRequest } from '../maintenance/entities/maintenance-request.entity';

@Injectable()
export class AiService {
  private insights: Repository<AiInsight>;
  private requestLogs: Repository<AiRequestLog>;
  private rentCharges: Repository<RentCharge>;
  private payments: Repository<Payment>;
  private expenses: Repository<Expense>;
  private obligations: Repository<TaxObligation>;
  private leases: Repository<Lease>;
  private maintenance: Repository<MaintenanceRequest>;

  constructor(private readonly dataSource: DataSource) {
    this.insights = dataSource.getRepository(AiInsight);
    this.requestLogs = dataSource.getRepository(AiRequestLog);
    this.rentCharges = dataSource.getRepository(RentCharge);
    this.payments = dataSource.getRepository(Payment);
    this.expenses = dataSource.getRepository(Expense);
    this.obligations = dataSource.getRepository(TaxObligation);
    this.leases = dataSource.getRepository(Lease);
    this.maintenance = dataSource.getRepository(MaintenanceRequest);
  }

  findAllInsights(): Promise<AiInsight[]> {
    return this.insights.find({ order: { generatedAt: 'DESC' }, take: 200 });
  }

  findAllRequestLogs(): Promise<AiRequestLog[]> {
    return this.requestLogs.find({ order: { createdAt: 'DESC' }, take: 500 });
  }

  async financialSummary(currency = 'USD', from?: string, to?: string) {
    const period = this.period(from, to);
    const charges = await this.rentCharges
      .createQueryBuilder('charge')
      .select('COALESCE(SUM(charge.amountMinor), 0)', 'total')
      .where('charge.periodStart <= :to AND charge.periodEnd >= :from', period)
      .andWhere('charge.currency = :currency', { currency })
      .andWhere('charge.status != :voided', { voided: 'voided' })
      .getRawOne<{ total: string }>();
    const collected = await this.payments
      .createQueryBuilder('payment')
      .select('COALESCE(SUM(payment.amountMinor), 0)', 'total')
      .where('payment.paidAt >= :from AND payment.paidAt < :toExclusive', {
        from: `${period.from}T00:00:00Z`,
        toExclusive: `${period.to}T23:59:59.999Z`,
      })
      .andWhere('payment.status = :status', { status: PaymentStatus.SUCCEEDED })
      .andWhere('payment.currency = :currency', { currency })
      .getRawOne<{ total: string }>();
    const expenses = await this.expenses
      .createQueryBuilder('expense')
      .select('COALESCE(SUM(expense.amountMinor), 0)', 'total')
      .where('expense.expenseDate BETWEEN :from AND :to', period)
      .andWhere('expense.status IN (:...statuses)', {
        statuses: [ExpenseStatus.APPROVED, ExpenseStatus.PAID],
      })
      .andWhere('expense.currency = :currency', { currency })
      .getRawOne<{ total: string }>();
    const outstanding = await this.rentCharges
      .createQueryBuilder('charge')
      .select(
        'COALESCE(SUM(charge.amountMinor - charge.allocatedMinor), 0)',
        'total',
      )
      .where('charge.status IN (:...statuses)', {
        statuses: ['outstanding', 'part_paid'],
      })
      .andWhere('charge.currency = :currency', { currency })
      .getRawOne<{ total: string }>();
    const gross = BigInt(charges?.total ?? '0');
    const income = BigInt(collected?.total ?? '0');
    const expenseTotal = BigInt(expenses?.total ?? '0');
    return {
      period,
      currency,
      grossChargesMinor: gross.toString(),
      collectedMinor: income.toString(),
      expensesMinor: expenseTotal.toString(),
      netIncomeMinor: (income - expenseTotal).toString(),
      outstandingMinor: BigInt(outstanding?.total ?? '0').toString(),
      collectionRate:
        gross === 0n ? null : Number((income * 10000n) / gross) / 100,
      source: 'rent_charges, successful_payments, approved_expenses',
    };
  }

  async recommendations(currency = 'USD') {
    const overdue = await this.rentCharges
      .createQueryBuilder('charge')
      .where('charge.dueDate < CURRENT_DATE')
      .andWhere('charge.status IN (:...statuses)', {
        statuses: ['outstanding', 'part_paid'],
      })
      .andWhere('charge.currency = :currency', { currency })
      .getCount();
    const taxDue = await this.obligations
      .createQueryBuilder('obligation')
      .select('COALESCE(SUM(obligation.taxAmount), 0)', 'total')
      .where('obligation.status IN (:...statuses)', {
        statuses: ['pending', 'due', 'overdue'],
      })
      .andWhere('obligation.dueDate <= CURRENT_DATE + 30')
      .andWhere('obligation.currency = :currency', { currency })
      .getRawOne<{ total: string }>();
    const recommendations = [] as Array<Record<string, unknown>>;
    if (overdue > 0) {
      recommendations.push({
        type: 'collections',
        priority: 'high',
        title: 'Review overdue rent charges',
        reason: `${overdue} rent charge(s) are overdue and unpaid or partly paid.`,
        confidence: 1,
        evidence: ['rent_charges.status', 'rent_charges.due_date'],
      });
    }
    if (BigInt(taxDue?.total ?? '0') > 0n) {
      recommendations.push({
        type: 'compliance',
        priority: 'medium',
        title: 'Review upcoming tax obligations',
        reason: `${taxDue?.total} minor units are due within 30 days.`,
        confidence: 1,
        evidence: ['tax_obligations.tax_amount', 'tax_obligations.due_date'],
      });
    }
    return { currency, recommendations, generatedBy: 'rules-based-insights' };
  }

  async predictions(currency = 'USD') {
    const horizon = new Date();
    horizon.setUTCDate(horizon.getUTCDate() + 90);
    const expiryDate = horizon.toISOString().slice(0, 10);
    const expiringLeases = await this.leases
      .createQueryBuilder('lease')
      .select(['lease.id', 'lease.reference', 'lease.endDate', 'lease.unitId'])
      .where('lease.endDate IS NOT NULL')
      .andWhere('lease.endDate <= :expiryDate', { expiryDate })
      .andWhere('lease.endDate >= CURRENT_DATE')
      .getMany();
    const openMaintenance = await this.maintenance
      .createQueryBuilder('request')
      .where('request.status IN (:...statuses)', {
        statuses: ['open', 'assigned', 'in_progress', 'approved'],
      })
      .getCount();
    const overdueCharges = await this.rentCharges
      .createQueryBuilder('charge')
      .where('charge.dueDate < CURRENT_DATE')
      .andWhere('charge.status IN (:...statuses)', {
        statuses: ['outstanding', 'part_paid'],
      })
      .andWhere('charge.currency = :currency', { currency })
      .getCount();

    return {
      generatedBy: 'rules-based-predictions',
      horizonDays: 90,
      predictions: [
        {
          type: 'vacancy_risk',
          level: expiringLeases.length > 0 ? 'medium' : 'low',
          value: expiringLeases.length,
          confidence: expiringLeases.length > 0 ? 1 : 0.8,
          reason: `${expiringLeases.length} lease(s) end within 90 days.`,
          evidence: expiringLeases.map((lease) => ({
            leaseId: lease.id,
            reference: lease.reference,
            endDate: lease.endDate,
            unitId: lease.unitId,
          })),
        },
        {
          type: 'maintenance_load',
          level:
            openMaintenance >= 10
              ? 'high'
              : openMaintenance > 0
                ? 'medium'
                : 'low',
          value: openMaintenance,
          confidence: 1,
          reason: `${openMaintenance} maintenance request(s) are currently open.`,
          evidence: ['maintenance_requests.status'],
        },
        {
          type: 'collection_risk',
          level:
            overdueCharges >= 10
              ? 'high'
              : overdueCharges > 0
                ? 'medium'
                : 'low',
          value: overdueCharges,
          confidence: 1,
          reason: `${overdueCharges} rent charge(s) are overdue.`,
          evidence: ['rent_charges.due_date', 'rent_charges.status'],
        },
      ],
    };
  }

  async benchmarkExpenses(currency = 'USD', from?: string, to?: string) {
    const period = this.period(from, to);
    const rows = await this.expenses
      .createQueryBuilder('expense')
      .select('expense.category', 'category')
      .addSelect('COALESCE(SUM(expense.amountMinor), 0)', 'amount')
      .where('expense.expenseDate BETWEEN :from AND :to', period)
      .andWhere('expense.status IN (:...statuses)', {
        statuses: [ExpenseStatus.APPROVED, ExpenseStatus.PAID],
      })
      .andWhere('expense.currency = :currency', { currency })
      .groupBy('expense.category')
      .orderBy('amount', 'DESC')
      .getRawMany<{ category: string; amount: string }>();
    const total = rows.reduce((sum, row) => sum + BigInt(row.amount), 0n);
    return {
      currency,
      period,
      totalMinor: total.toString(),
      categories: rows.map((row) => ({
        category: row.category,
        amountMinor: row.amount,
        sharePercent:
          total === 0n
            ? 0
            : Number((BigInt(row.amount) * 10000n) / total) / 100,
      })),
      confidence: 1,
      source: 'approved_expenses',
    };
  }

  async explainMetric(
    metric: string,
    currency = 'USD',
    from?: string,
    to?: string,
  ) {
    const summary = await this.financialSummary(currency, from, to);
    const explanations: Record<
      string,
      { value: string | number | null; formula: string; inputs: string[] }
    > = {
      gross_charges: {
        value: summary.grossChargesMinor,
        formula: 'SUM(rent charges in period)',
        inputs: [
          'rent_charges.amount_minor',
          'rent_charges.period_start',
          'rent_charges.period_end',
        ],
      },
      collected: {
        value: summary.collectedMinor,
        formula: 'SUM(successful payments in period)',
        inputs: [
          'payments.amount_minor',
          'payments.paid_at',
          'payments.status',
        ],
      },
      expenses: {
        value: summary.expensesMinor,
        formula: 'SUM(approved or paid expenses in period)',
        inputs: [
          'expenses.amount_minor',
          'expenses.expense_date',
          'expenses.status',
        ],
      },
      net_income: {
        value: summary.netIncomeMinor,
        formula: 'collected - expenses',
        inputs: ['payments.amount_minor', 'expenses.amount_minor'],
      },
      outstanding: {
        value: summary.outstandingMinor,
        formula: 'SUM(charge amount - allocated amount)',
        inputs: [
          'rent_charges.amount_minor',
          'rent_charges.allocated_minor',
          'rent_charges.status',
        ],
      },
      collection_rate: {
        value: summary.collectionRate,
        formula: 'collected / gross charges * 100',
        inputs: ['payments.amount_minor', 'rent_charges.amount_minor'],
      },
    };
    const explanation = explanations[metric];
    if (!explanation) {
      throw new BadRequestException(
        `Unknown metric. Supported metrics: ${Object.keys(explanations).join(', ')}`,
      );
    }
    return {
      metric,
      value: explanation.value,
      currency,
      period: summary.period,
      formula: explanation.formula,
      inputs: explanation.inputs,
      confidence: 1,
      source: summary.source,
      generatedBy: 'rules-based-explanation',
    };
  }

  private period(from?: string, to?: string) {
    const end = to ?? new Date().toISOString().slice(0, 10);
    const start =
      from ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    return { from: start, to: end };
  }
}
