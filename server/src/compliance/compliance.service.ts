import {
  BadRequestException,
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
import { User } from '../users/entities/user.entity';

@Injectable()
export class ComplianceService {
  private readonly dataSource: DataSource;
  private readonly rules: Repository<TaxRule>;
  private readonly profiles: Repository<ZimraProfile>;
  private readonly identifications: Repository<TenantIdentification>;
  private readonly obligations: Repository<TaxObligation>;
  private readonly tenants: Repository<Tenant>;
  private readonly users: Repository<User>;
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
    this.users = dataSource.getRepository(User);
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

  /** Attach a ZIMRA / compliance document to a profile. Owners may only touch
   * their own profile; admins may attach to any. */
  async uploadProfileDocument(
    user: AuthJwtPayload,
    profileId: string,
    file?: Express.Multer.File,
    documentType?: string,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const profile = await this.profiles.findOne({ where: { id: profileId } });
    if (!profile) throw new NotFoundException('ZIMRA profile not found');
    if (!seesEverything(user) && profile.organizationId !== user.id) {
      throw new ForbiddenException('You can only manage your own profile');
    }
    const documents = Array.isArray(profile.documents) ? profile.documents : [];
    documents.push({
      id: file.filename,
      name: file.originalname,
      url: `/uploads/compliance/${file.filename}`,
      mime: file.mimetype,
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
      documentType: documentType?.trim() || undefined,
    });
    profile.documents = documents;
    return this.profiles.save(profile);
  }

  /** Remove a previously uploaded compliance document. */
  async removeProfileDocument(
    user: AuthJwtPayload,
    profileId: string,
    documentId: string,
  ) {
    const profile = await this.profiles.findOne({ where: { id: profileId } });
    if (!profile) throw new NotFoundException('ZIMRA profile not found');
    if (!seesEverything(user) && profile.organizationId !== user.id) {
      throw new ForbiddenException('You can only manage your own profile');
    }
    const documents = (
      Array.isArray(profile.documents) ? profile.documents : []
    ).filter((doc) => doc.id !== documentId);
    profile.documents = documents;
    return this.profiles.save(profile);
  }

  private async resolveTenant(tenantId: string): Promise<Tenant | null> {
    let tenant = await this.tenants.findOne({ where: { id: tenantId } });
    if (tenant) return tenant;

    // Check if tenantId was supplied as the tenant's user account id
    tenant = await this.tenants.findOne({ where: { userId: tenantId } });
    if (tenant) return tenant;

    // If a user account exists with this ID, auto-link/create a corresponding Tenant record
    const userAccount = await this.users.findOne({ where: { id: tenantId } });
    if (userAccount) {
      const names = (userAccount.name || 'Tenant').trim().split(' ');
      const firstName = names[0] || 'Tenant';
      const lastName = names.slice(1).join(' ') || firstName;
      return this.tenants.save(
        this.tenants.create({
          userId: userAccount.id,
          firstName,
          lastName,
          email: userAccount.email,
          phone: userAccount.phone || '',
        }),
      );
    }

    return null;
  }

  async saveTenantIdentification(
    user: AuthJwtPayload,
    tenantId: string,
    dto: CreateTenantIdentificationDto,
  ) {
    this.assertCanManage(user);
    const tenant = await this.resolveTenant(tenantId);
    if (!tenant) throw new NotFoundException('Tenant not found');

    const identification =
      (await this.identifications.findOne({
        where: { tenantId: tenant.id },
      })) ?? this.identifications.create({ tenantId: tenant.id });
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

  async getTenantIdentification(user: AuthJwtPayload, tenantId: string) {
    this.assertCanManage(user);
    const direct = await this.identifications.findOne({ where: { tenantId } });
    if (direct) return direct;

    const tenant = await this.tenants.findOne({ where: { userId: tenantId } });
    if (tenant) {
      return this.identifications.findOne({ where: { tenantId: tenant.id } });
    }
    return null;
  }

  async verifyTenantIdentification(user: AuthJwtPayload, tenantId: string) {
    this.assertCanManage(user);
    let identification = await this.identifications.findOne({
      where: { tenantId },
    });
    if (!identification) {
      const tenant = await this.tenants.findOne({
        where: { userId: tenantId },
      });
      if (tenant) {
        identification = await this.identifications.findOne({
          where: { tenantId: tenant.id },
        });
      }
    }
    if (!identification)
      throw new NotFoundException('Identification not found');
    identification.verified = true;
    identification.verifiedBy = user.id;
    identification.verifiedAt = new Date();
    return this.identifications.save(identification);
  }

  async createObligation(user: AuthJwtPayload, dto: CreateTaxObligationDto) {
    this.assertCanManage(user);
    const profile = await this.profiles.findOne({
      where: { id: dto.zimraProfileId },
    });
    if (!profile) throw new NotFoundException('ZIMRA profile not found');
    if (!seesEverything(user) && profile.organizationId !== user.id) {
      throw new ForbiddenException('You can only manage your own profile');
    }
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
      where: {
        ...(profileId ? { zimraProfileId: profileId } : {}),
        // Landlords/PMs only see their own organization's obligations.
        ...(seesEverything(user) ? {} : { organizationId: user.id }),
      },
      relations: { rule: true },
      order: { dueDate: 'ASC' },
    });
  }

  async generateTaxReturn(user: AuthJwtPayload, dto: GenerateTaxReturnDto) {
    this.assertCanManage(user);
    const profile = await this.profiles.findOne({
      where: { id: dto.zimraProfileId },
    });
    if (!profile) throw new NotFoundException('ZIMRA profile not found');
    if (!seesEverything(user) && profile.organizationId !== user.id) {
      throw new ForbiddenException('You can only manage your own profile');
    }
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
      where: {
        ...(profileId ? { zimraProfileId: profileId } : {}),
        // Landlords/PMs only see their own organization's returns.
        ...(seesEverything(user) ? {} : { organizationId: user.id }),
      },
      order: { taxPeriodEnd: 'DESC' },
    });
  }

  async getTaxReturn(user: AuthJwtPayload, id: string) {
    this.assertReadable(user);
    const taxReturn = await this.returns.findOne({ where: { id } });
    if (!taxReturn) throw new NotFoundException('Tax return not found');
    if (!seesEverything(user) && taxReturn.organizationId !== user.id) {
      throw new NotFoundException('Tax return not found');
    }
    const lines = await this.returnLines.find({
      where: { taxReturnId: id },
      order: { lineType: 'ASC', createdAt: 'ASC' },
    });
    return { ...taxReturn, lines };
  }

  /** Render a stored tax return as a downloadable PDF. */
  async getTaxReturnPdf(user: AuthJwtPayload, id: string): Promise<Buffer> {
    this.assertReadable(user);
    const taxReturn = await this.returns.findOne({ where: { id } });
    if (!taxReturn) throw new NotFoundException('Tax return not found');
    if (!seesEverything(user) && taxReturn.organizationId !== user.id) {
      throw new NotFoundException('Tax return not found');
    }
    const profile = await this.profiles.findOne({
      where: { id: taxReturn.zimraProfileId },
    });
    const lines = await this.returnLines.find({
      where: { taxReturnId: id },
      order: { lineType: 'ASC', createdAt: 'ASC' },
    });

    const text = [
      'ZIMRA TAX RETURN',
      `Taxpayer: ${profile?.taxpayerName ?? ''} (TIN ${profile?.tin ?? ''})`,
      `Tax type: ${taxReturn.taxType}`,
      `Period: ${taxReturn.taxPeriodStart} to ${taxReturn.taxPeriodEnd}`,
      `Status: ${taxReturn.status}`,
      `Generated: ${taxReturn.generatedAt?.toISOString().slice(0, 10) ?? ''}`,
      '',
      `Gross rental income: ${taxReturn.grossRentalIncome}`,
      `Allowable deductions: ${taxReturn.allowableDeductions}`,
      `Net income: ${taxReturn.netIncome}`,
      `Tax due: ${taxReturn.taxDue}`,
      `Tax paid: ${taxReturn.taxPaid}`,
      `Tax balance: ${taxReturn.taxBalance}`,
      `Currency: ${taxReturn.currency}`,
      '',
      'Line items',
      ...lines.map(
        (line) => `${line.lineType} | ${line.description} | ${line.amount}`,
      ),
    ];
    return createPdf(text);
  }

  private calculateTax(amountMinor: string, rate: string) {
    const [whole, fraction = ''] = rate.split('.');
    const rateScaled = BigInt(`${whole}${fraction.padEnd(4, '0').slice(0, 4)}`);
    return ((BigInt(amountMinor) * rateScaled + 5000n) / 10000n).toString();
  }

  /**
   * Landlords and property managers get the same compliance capabilities as
   * admins, scoped to their own organization (enforced per-operation).
   */
  private assertCanManage(user: AuthJwtPayload) {
    if (!seesEverything(user) && !OWNER_ROLES.includes(user.role)) {
      throw new ForbiddenException(
        'Only landlords and property managers can manage compliance data',
      );
    }
  }

  private assertReadable(user: AuthJwtPayload) {
    if (user.role === UserRole.VENDOR) {
      throw new ForbiddenException('Vendors cannot access compliance data');
    }
  }
}

/** Minimal single-page PDF renderer (mirrors reports.service). */
function createPdf(lines: string[]): Buffer {
  const content = [
    'BT',
    '/F1 11 Tf',
    '50 790 Td',
    ...lines.flatMap((line) => [`(${escapePdfText(line)}) Tj`, '0 -16 Td']),
    'ET',
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'utf8');
}

function escapePdfText(value: string): string {
  return value.replace(/[\\()]/g, '\\$&').replace(/[^\x20-\x7E]/g, '?');
}
