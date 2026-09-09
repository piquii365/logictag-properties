import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';

/** Cached AI-generated analysis for some scope (a property, a portfolio...).
 * ponytail: registered and readable; no feature writes to it yet. */
@Entity('ai_insights')
export class AiInsight extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ length: 32 })
  scopeType!: string;

  @Column({ type: 'uuid', nullable: true })
  scopeId!: string | null;

  @Column({ type: 'jsonb' })
  insights!: Record<string, unknown>;

  @Column({ length: 64 })
  model!: string;

  @Column({ length: 32 })
  provider!: string;

  @Column({ length: 64 })
  promptHash!: string;

  @Column({ type: 'int' })
  inputTokens!: number;

  @Column({ type: 'int' })
  outputTokens!: number;

  @Column({ type: 'timestamptz' })
  generatedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;
}
