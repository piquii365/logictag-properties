import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';
import { Utility } from './utility.entity';
import { User } from '../../users/entities/user.entity';

@Entity('utility_rates')
export class UtilityRate extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'utility_id' })
  utilityId!: string;

  @ManyToOne(() => Utility, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utility_id' })
  utility!: Utility;

  @Column({ type: 'bigint' })
  rateMinor!: string;

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency!: string;

  @Column({ type: 'varchar', length: 24, nullable: true })
  unitLabel!: string | null;

  @Column({ type: 'bigint', default: 0 })
  standingChargeMinor!: string;

  @Column({ type: 'date' })
  effectiveFrom!: string;

  @Column({ type: 'date', nullable: true })
  effectiveTo!: string | null;

  @Column({ type: 'uuid', name: 'created_by_user_id' })
  createdByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy!: User;
}
