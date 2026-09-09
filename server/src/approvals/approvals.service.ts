import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { UserRole } from '../auth/enums/role.enum';
import { seesEverything } from '../common/access';
import { Approval, ApprovalStatus } from './entities/approval.entity';
import { CreateApprovalDto } from './dto/create-approval.dto';

const isBackOffice = (user: AuthJwtPayload) =>
  seesEverything(user) || user.role === UserRole.STAFF;

@Injectable()
export class ApprovalsService {
  private readonly approvals: Repository<Approval>;

  constructor(dataSource: DataSource) {
    this.approvals = dataSource.getRepository(Approval);
  }

  async create(user: AuthJwtPayload, dto: CreateApprovalDto) {
    if (!isBackOffice(user)) {
      throw new ForbiddenException(
        'Only back-office users can create approvals',
      );
    }
    return this.approvals.save(
      this.approvals.create({
        ...dto,
        status: ApprovalStatus.PENDING,
        actionBy: null,
        actionAt: null,
        actionNotes: null,
      }),
    );
  }

  findPending(user: AuthJwtPayload) {
    const where = isBackOffice(user)
      ? { status: ApprovalStatus.PENDING }
      : { status: ApprovalStatus.PENDING, assignedTo: user.id };
    return this.approvals.find({
      where,
      relations: { assignee: true },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(user: AuthJwtPayload, id: string) {
    const approval = await this.approvals.findOne({
      where: { id },
      relations: { assignee: true },
    });
    if (!approval || (!isBackOffice(user) && approval.assignedTo !== user.id)) {
      throw new NotFoundException('Approval not found');
    }
    return approval;
  }

  approve(user: AuthJwtPayload, id: string, notes?: string) {
    return this.act(user, id, ApprovalStatus.APPROVED, notes);
  }

  reject(user: AuthJwtPayload, id: string, notes?: string) {
    return this.act(user, id, ApprovalStatus.REJECTED, notes);
  }

  private async act(
    user: AuthJwtPayload,
    id: string,
    status: ApprovalStatus,
    notes?: string,
  ) {
    const approval = await this.findOne(user, id);
    if (approval.status !== ApprovalStatus.PENDING) {
      throw new ForbiddenException('This approval has already been actioned');
    }
    approval.status = status;
    approval.actionBy = user.id;
    approval.actionAt = new Date();
    approval.actionNotes = notes ?? null;
    return this.approvals.save(approval);
  }
}
