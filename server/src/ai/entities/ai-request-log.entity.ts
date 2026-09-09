import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/** Immutable log of every AI provider call (cost/latency/error tracking). */
@Entity('ai_request_logs')
export class AiRequestLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @Index()
  @Column({ length: 32 })
  scopeType!: string;

  @Column({ type: 'uuid', nullable: true })
  scopeId!: string | null;

  @Column({ length: 32 })
  provider!: string;

  @Column({ length: 64 })
  model!: string;

  @Column({ length: 64 })
  promptHash!: string;

  @Column({ type: 'int' })
  inputTokens!: number;

  @Column({ type: 'int' })
  outputTokens!: number;

  @Column({ type: 'int' })
  latencyMs!: number;

  @Column({ length: 16 })
  status!: string;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
