import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { seesEverything } from '../common/access';
import { UserRole } from '../auth/enums/role.enum';
import { Property } from '../properties/entities/property.entity';
import { Unit } from '../properties/entities/unit.entity';
import { RentCharge } from '../billing/entities/rent-charge.entity';

@Injectable()
export class ReportsService {
  private readonly properties: Repository<Property>;
  private readonly units: Repository<Unit>;
  private readonly charges: Repository<RentCharge>;

  constructor(dataSource: DataSource) {
    this.properties = dataSource.getRepository(Property);
    this.units = dataSource.getRepository(Unit);
    this.charges = dataSource.getRepository(RentCharge);
  }

  async propertyPdf(user: AuthJwtPayload, propertyId: string): Promise<Buffer> {
    const property = await this.properties.findOne({
      where: { id: propertyId },
    });
    if (!property || !(seesEverything(user) || property.ownerId === user.id)) {
      throw new NotFoundException('Property not found');
    }
    if (user.role === UserRole.VENDOR || user.role === UserRole.TENANT) {
      throw new ForbiddenException(
        'This report is only available to property managers',
      );
    }

    const units = await this.units.find({
      where: { propertyId },
      relations: { tenant: true },
      order: { label: 'ASC' },
    });
    const chargeTotal = await this.charges
      .createQueryBuilder('charge')
      .innerJoin('charge.lease', 'lease')
      .innerJoin('lease.unit', 'unit')
      .where('unit.propertyId = :propertyId', { propertyId })
      .select('COALESCE(SUM(charge.amountMinor), 0)', 'total')
      .getRawOne<{ total: string }>();

    const lines = [
      property.name,
      `Property report generated ${new Date().toISOString().slice(0, 10)}`,
      `${property.address}${property.city ? `, ${property.city}` : ''}`,
      '',
      `Total units: ${units.length}`,
      `Occupied units: ${units.filter((unit) => unit.status === 'occupied').length}`,
      `Vacant units: ${units.filter((unit) => unit.status === 'vacant').length}`,
      `Rent charges recorded: ${chargeTotal?.total ?? '0'} minor units`,
      '',
      'Units',
      ...units.map(
        (unit) =>
          `${unit.label} | ${unit.status} | ${unit.tenant?.name ?? 'Vacant'} | rent ${unit.rent}`,
      ),
    ];
    return createPdf(lines);
  }
}

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
