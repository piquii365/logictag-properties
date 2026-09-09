import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';
import { Meter } from './meter.entity';
import { User } from '../../users/entities/user.entity';

export type MeterReadingSource = 'manual' | 'estimated' | 'imported';

@Entity('meter_readings')
export class MeterReading extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'meter_id' })
  meterId!: string;

  @ManyToOne(() => Meter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meter_id' })
  meter!: Meter;

  @Column({ type: 'numeric', precision: 14, scale: 3 })
  reading!: string;

  @Column({ type: 'date' })
  readingDate!: string;

  @Column({ type: 'uuid', name: 'previous_reading_id', nullable: true })
  previousReadingId!: string | null;

  @ManyToOne(() => MeterReading, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'previous_reading_id' })
  previousReading!: MeterReading | null;

  @Column({ type: 'numeric', precision: 14, scale: 3, nullable: true })
  consumption!: string | null;

  @Column({ length: 16, default: 'manual' })
  source!: MeterReadingSource;

  @Column({ default: false })
  isEstimated!: boolean;

  @Column({ type: 'text', nullable: true })
  overrideReason!: string | null;

  @Column({ type: 'uuid', name: 'recorded_by_user_id' })
  recordedByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'recorded_by_user_id' })
  recordedBy!: User;
}
