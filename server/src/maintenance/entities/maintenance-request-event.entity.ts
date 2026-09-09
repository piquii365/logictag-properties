import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MaintenanceRequest } from './maintenance-request.entity';
import { User } from '../../users/entities/user.entity';

/** Immutable status-change/audit trail for a maintenance request. */
@Entity('maintenance_request_events')
export class MaintenanceRequestEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'maintenance_request_id' })
  maintenanceRequestId!: string;

  @ManyToOne(() => MaintenanceRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'maintenance_request_id' })
  maintenanceRequest!: MaintenanceRequest;

  @Column({ type: 'uuid', name: 'actor_user_id', nullable: true })
  actorUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actor_user_id' })
  actor!: User | null;

  @Column({ length: 40 })
  type!: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  fromStatus!: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  toStatus!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
