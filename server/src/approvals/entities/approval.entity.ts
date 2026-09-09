import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';
import { User } from '../../users/entities/user.entity';

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  RETURNED = 'returned',
}

@Entity('approvals')
export class Approval extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32 })
  workflowType!: string;

  @Column({ type: 'varchar', length: 32 })
  entityType!: string;

  @Index()
  @Column({ type: 'uuid', name: 'entity_id' })
  entityId!: string;

  @Index()
  @Column({ type: 'uuid', name: 'assigned_to' })
  assignedTo!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'assigned_to' })
  assignee!: User;

  @Column({ type: 'varchar', length: 16, default: ApprovalStatus.PENDING })
  status!: ApprovalStatus;

  @Column({ type: 'uuid', name: 'action_by', nullable: true })
  actionBy!: string | null;

  @Column({ type: 'timestamptz', name: 'action_at', nullable: true })
  actionAt!: Date | null;

  @Column({ type: 'text', name: 'action_notes', nullable: true })
  actionNotes!: string | null;
}
