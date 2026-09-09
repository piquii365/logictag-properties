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

export type AdjustableType = 'rent_charges' | 'utility_charges';
export type ChargeAdjustmentType =
  'waiver' | 'discount' | 'penalty' | 'correction';

/** A manual +/- correction against a rent or utility charge. Polymorphic
 * (`adjustableType` + `adjustableId`) since both charge kinds share this. */
@Entity('charge_adjustments')
export class ChargeAdjustment extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 24 })
  adjustableType!: AdjustableType;

  @Index()
  @Column({ type: 'uuid' })
  adjustableId!: string;

  @Column({ length: 24 })
  type!: ChargeAdjustmentType;

  @Column({ type: 'bigint' })
  amountMinor!: string;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ type: 'uuid', name: 'created_by_user_id' })
  createdByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy!: User;
}
