import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditQuery {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditService {
  private auditLogs: Repository<AuditLog>;

  constructor(private readonly dataSource: DataSource) {
    this.auditLogs = dataSource.getRepository(AuditLog);
  }

  /** Called by any service that wants to leave a trail. */
  record(
    entry: Omit<AuditLog, 'id' | 'createdAt' | 'user'>,
  ): Promise<AuditLog> {
    return this.auditLogs.save(this.auditLogs.create(entry));
  }

  findAll(): Promise<AuditLog[]> {
    return this.auditLogs.find({ order: { createdAt: 'DESC' }, take: 500 });
  }

  /** Admin query with optional filters + pagination. */
  async query(query: AuditQuery = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const qb = this.auditLogs
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.userId) {
      qb.andWhere('log.userId = :userId', { userId: query.userId });
    }
    if (query.action) {
      qb.andWhere('log.action = :action', { action: query.action });
    }
    if (query.entityType) {
      qb.andWhere('log.entityType = :entityType', {
        entityType: query.entityType,
      });
    }
    if (query.entityId) {
      qb.andWhere('log.entityId = :entityId', { entityId: query.entityId });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }
}
