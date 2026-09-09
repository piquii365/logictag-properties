import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';
import { Unit } from '../../properties/entities/unit.entity';
import { Utility } from './utility.entity';

@Entity('meters')
export class Meter extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'unit_id' })
  unitId!: string;

  @ManyToOne(() => Unit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_id' })
  unit!: Unit;

  @Index()
  @Column({ type: 'uuid', name: 'utility_id' })
  utilityId!: string;

  @ManyToOne(() => Utility, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utility_id' })
  utility!: Utility;

  @Column({ length: 64 })
  meterNumber!: string;

  @Column({ type: 'smallint', default: 6 })
  digits!: number;

  @Column({ type: 'numeric', precision: 8, scale: 3, default: 1 })
  multiplier!: string;

  @Column({ type: 'date', nullable: true })
  installedOn!: string | null;

  @Column({ default: true })
  isActive!: boolean;
}
