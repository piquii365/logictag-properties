import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { OWNER_ROLES, seesEverything } from '../common/access';
import { Tenant } from '../tenants/entities/tenant.entity';
import { TaxRule } from './entities/tax-rule.entity';
import { CreateTaxRuleDto } from './dto/create-tax-rule.dto';
import { ZimraProfile } from './entities/zimra-profile.entity';
import { TenantIdentification } from './entities/tenant-identification.entity';
import { TaxObligation } from './entities/tax-obligation.entity';
import { CreateZimraProfileDto } from './dto/create-zimra-profile.dto';
import { CreateTenantIdentificationDto } from './dto/create-tenant-identification.dto';
import { CreateTaxObligationDto } from './dto/create-tax-obligation.dto';
import { GenerateTaxReturnDto } from './dto/generate-tax-return.dto';
import { RentCharge } from '../billing/entities/rent-charge.entity';
import { Expense, ExpenseStatus } from '../expenses/entities/expense.entity';
import { TaxReturn } from './entities/tax-return.entity';
import { TaxReturnLine } from './entities/tax-return-line.entity';
import { UserRole } from '../auth/enums/role.enum';

@Injectable()
export class ComplianceService {
  private readonly dataSource: DataSource;
  private readonly rules: Repository<TaxRule>;
  private readonly profiles: Repository<ZimraProfile>;
  private readonly identifications: Repository<TenantIdentification>;
  private readonly obligations: Repository<TaxObligation>;
  private readonly tenants: Repository<Tenant>;
  private readonly rentCharges: Repository<RentCharge>;
  private readonly expenses: Repository<Expense>;
  private readonly returns: Repository<TaxReturn>;
  private readonly returnLines: Repository<TaxReturnLine>;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.rules = dataSource.getRepository(TaxRule);
    this.profiles = dataSource.getRepository(ZimraProfile);
    this.identifications = dataSource.getRepository(TenantIdentification);
    this.obligations = dataSource.getRepository(TaxObligation);
    this.tenants = dataSource.getRepository(Tenant);
    this.rentCharges = dataSource.getRepository(RentCharge);
    this.expenses = dataSource.getRepository(Expense);
    this.returns = dataSource.getRepository(TaxReturn);
    this.returnLines = dataSource.getRepository(TaxReturnLine);
  }

  listRules(taxType?: string): Promise<TaxRule[]> {
    return this.rules.find({
      where: taxType ? { taxType } : undefined,
      order: { taxType: 'ASC', effectiveFrom: 'DESC', version: 'DESC' },
    });
  }

  async createRule(dto: CreateTaxRuleDto): Promise<TaxRule> {
    const existing = await this.rules.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException('Tax rule code already exists');
    if (dto.effectiveTo && dto.effectiveTo < dto.effectiveFrom) {
      throw new ConflictException('Tax rule end date precedes its start date');
    }
    return this.rules.save(
      this.rules.create({
        ...dto,
        jurisdiction: dto.jurisdiction ?? 'ZW',
        effectiveTo: dto.effectiveTo ?? null,
        sourceReference: dto.sourceReference ?? null,
        version: dto.version ?? 1,
        active: dto.active ?? true,
      }),
    );
  }

  async getRuleForDate(taxType: string, date: string): Promise<TaxRule> {
    const candidates = await this.rules
      .createQueryBuilder('rule')
      .where('rule.taxType = :taxType', { taxType })
      .andWhere('rule.active = true')
      .andWhere('rule.effectiveFrom <= :date', { date })
      .andWhere('(rule.effectiveTo IS NULL OR rule.effectiveTo >= :date)', {
        date,
      })
      .orderBy('rule.version', 'DESC')
      .addOrderBy('rule.effective_from', 'DESC')
      .getMany();
    if (candidates.length === 0) {
      throw new NotFoundException(
        `No active ${taxType} tax rule applies on ${date}`,
      );
    }
    return candidates[0];
  }

  async createProfile(user: AuthJwtPayload, dto: CreateZimraProfileDto) {
    if (!seesEverything(user) && !OWNER_ROLES.includes(user.role)) {
      throw new ForbiddenException(
        'Only landlords and property managers can manage ZIMRA profiles',
      );
    }
    const organizationId = dto.organizationId ?? user.id;
    const existing = await this.profiles.findOne({
      where: [{ organizationId }, { tin: dto.tin }],
    });
    if (existing) throw new ConflictException('ZIMRA profile already exists');
    return this.profiles.save(
      this.profiles.create({
        ...dto,
        organizationId,
        taxpayerName: dto.taxpayerName ?? null,
        registrationDate: dto.registrationDate ?? null,
        vatRegistered: dto.vatRegistered ?? false,
        vatNumber: dto.vatNumber ?? null,
        presumptiveRentalRegistered: dto.presumptiveRentalRegistered ?? false,
        itf263Number: null,
        registrationStatus: 'active',
        taxYearEndMonth: dto.taxYearEndMonth ?? 12,
      }),
    );
  }

  listProfiles(user: AuthJwtPayload) {
    this.assertReadable(user);
    return this.profiles.find({
      where: seesEverything(user) ? {} : { organizationId: user.id },
      order: { createdAt: 'DESC' },
    });
  }

  async saveTenantIdentification(
    user: AuthJwtPayload,
    tenantId: string,
    dto: CreateTenantIdentificationDto,
  ) {
    this.assertBackOffice(user);
    const tenant = await this.tenants.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const identification =
      (await this.identifications.findOne({ where: { tenantId } })) ??
      this.identifications.create({ tenantId });
    Object.assign(identification, {
      ...dto,
      idIssueDate: dto.idIssueDate ?? null,
      idExpiryDate: dto.idExpiryDate ?? null,
      issuingCountry: dto.issuingCountry ?? 'ZW',
      documentId: dto.documentId ?? null,
      verified: false,
      verifiedBy: null,
      verifiedAt: null,
    });
    return this.identifications.save(identification);
  }

  getTenantIdentification(user: AuthJwtPayload, tenantId: string) {
    this.assertBackOffice(user);
    return this.identifications.findOne({ where: { tenantId } });
  }

  async verifyTenantIdentification(user: AuthJwtPayload, tenantId: string) {
    this.assertBackOffice(user);
    const identification = await this.identifications.findOne({
      where: { tenantId },
    });
    if (!identification)
      throw new NotFoundException('Identification not found');
    identification.verified = true;
    identification.verifiedBy = user.id;
    identification.verifiedAt = new Date();
    return this.identifications.save(identification);
  }

  async createObligation(user: AuthJwtPayload, dto: CreateTaxObligationDto) {
    this.assertBackOffice(user);
    const profile = await this.profiles.findOne({
      where: { id: dto.zimraProfileId },
    });
    if (!profile) throw new NotFoundException('ZIMRA profile not found');
    const rule = await this.getRuleForDate(dto.taxType, dto.taxPeriodEnd);
    return this.obligations.save(
      this.obligations.create({
        ...dto,
        organizationId: profile.organizationId,
        liablePartyId: dto.liablePartyId ?? null,
        propertyId: dto.propertyId ?? null,
        leaseId: dto.leaseId ?? null,
        taxRate: rule.rate,
        taxAmount: this.calculateTax(dto.taxableAmount, rule.rate),
        ruleVersionId: rule.id,
        status: 'pending',
      }),
    );
  }

  listObligations(user: AuthJwtPayload, profileId?: string) {
    this.assertReadable(user);
    return this.obligations.find({
      where: profileId ? { zimraProfileId: profileId } : undefined,
      relations: { rule: true },
      order: { dueDate: 'ASC' },
    });
  }

  async generateTaxReturn(user: AuthJwtPayload, dto: GenerateTaxReturnDto) {
    this.assertBackOffice(user);
    const profile = await this.profiles.findOne({
      where: { id: dto.zimraProfileId },
    });
    if (!profile) throw new NotFoundException('ZIMRA profile not found');
    const existing = await this.returns.findOne({
      where: {
        zimraProfileId: dto.zimraProfileId,
        taxType: dto.taxType,
        taxPeriodStart: dto.taxPeriodStart,
        taxPeriodEnd: dto.taxPeriodEnd,
      },
    });
    if (existing)
      throw new ConflictException('Tax return already exists for this period');

    const income = await this.rentCharges
      .createQueryBuilder('charge')
      .select('COALESCE(SUM(charge.amountMinor), 0)', 'total')
      .where('charge.periodStart <= :end', { end: dto.taxPeriodEnd })
      .andWhere('charge.periodEnd >= :start', { start: dto.taxPeriodStart })
      .andWhere('charge.status != :voided', { voided: 'voided' })
      .andWhere('charge.currency = :currency', { currency: dto.currency })
      .getRawOne<{ total: string }>();
    const expenses = await this.expenses
      .createQueryBuilder('expense')
      .where('expense.expenseDate BETWEEN :start AND :end', {
        start: dto.taxPeriodStart,
        end: dto.taxPeriodEnd,
      })
      .andWhere('expense.status IN (:...statuses)', {
        statuses: [ExpenseStatus.APPROVED, ExpenseStatus.PAID],
      })
      .andWhere('expense.currency = :currency', { currency: dto.currency })
      .getMany();
    const gross = BigInt(income?.total ?? '0');
    const deductions = expenses.reduce(
      (total, expense) => total + BigInt(expense.amountMinor),
      0n,
    );
    const netIncome = gross > deductions ? gross - deductions : 0n;
    const rule = await this.getRuleForDate(dto.taxType, dto.taxPeriodEnd);
    const taxDue = this.calculateTax(netIncome.toString(), rule.rate);

    return this.dataSource.transaction(async (manager) => {
      const taxReturn = await manager.save(
        manager.create(TaxReturn, {
          organizationId: profile.organizationId,
          zimraProfileId: profile.id,
          taxType: dto.taxType,
          taxPeriodStart: dto.taxPeriodStart,
          taxPeriodEnd: dto.taxPeriodEnd,
          status: 'draft',
          grossRentalIncome: gross.toString(),
          allowableDeductions: deductions.toString(),
          netIncome: netIncome.toString(),
          taxDue,
          taxPaid: '0',
          taxBalance: taxDue,
          currency: dto.currency,
          generatedAt: new Date(),
        }),
      );
      await manager.save(
        manager.create(TaxReturnLine, {
          taxReturnId: taxReturn.id,
          lineType: 'rental_income',
          description: 'Rent charges in return period',
          amount: gross.toString(),
          entityType: null,
          entityId: null,
        }),
      );
      for (const expense of expenses) {
        await manager.save(
          manager.create(TaxReturnLine, {
            taxReturnId: taxReturn.id,
            lineType: 'deduction',
            description: expense.description,
            amount: expense.amountMinor,
            entityType: 'expense',
            entityId: expense.id,
          }),
        );
      }
      await manager.save(
        manager.create(TaxReturnLine, {
          taxReturnId: taxReturn.id,
          lineType: 'tax_calculation',
          description: `Tax calculated using rule ${rule.code}`,
          amount: taxDue,
          entityType: 'tax_rule',
          entityId: rule.id,
        }),
      );
      return taxReturn;
    });
  }

  listTaxReturns(user: AuthJwtPayload, profileId?: string) {
    this.assertReadable(user);
    return this.returns.find({
      where: profileId ? { zimraProfileId: profileId } : undefined,
      order: { taxPeriodEnd: 'DESC' },
    });
  }

  async getTaxReturn(user: AuthJwtPayload, id: string) {
    this.assertReadable(user);
    const taxReturn = await this.returns.findOne({ where: { id } });
    if (!taxReturn) throw new NotFoundException('Tax return not found');
    const lines = await this.returnLines.find({
      where: { taxReturnId: id },
      order: { lineType: 'ASC', createdAt: 'ASC' },
    });
    return { ...taxReturn, lines };
  }

  private calculateTax(amountMinor: string, rate: string) {
    const [whole, fraction = ''] = rate.split('.');
    const rateScaled = BigInt(`${whole}${fraction.padEnd(4, '0').slice(0, 4)}`);
    return ((BigInt(amountMinor) * rateScaled + 5000n) / 10000n).toString();
  }

  private assertBackOffice(user: AuthJwtPayload) {
    if (!seesEverything(user)) {
      throw new ForbiddenException('Admin access required');
    }
  }

  private assertReadable(user: AuthJwtPayload) {
    if (user.role === UserRole.VENDOR) {
      throw new ForbiddenException('Vendors cannot access compliance data');
    }
  }
}
