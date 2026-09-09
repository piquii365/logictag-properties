import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  private auditLogs: Repository<AuditLog>;

  constructor(private readonly dataSource: DataSource) {
    this.auditLogs = dataSource.getRepository(AuditLog);
  }

  /** Called by any service that wants to leave a trail; not wired into the
   * rest of the app yet (see the entity's ponytail note). */
  record(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
    return this.auditLogs.save(this.auditLogs.create(entry));
  }

  findAll(): Promise<AuditLog[]> {
    return this.auditLogs.find({ order: { createdAt: 'DESC' }, take: 500 });
  }
}
