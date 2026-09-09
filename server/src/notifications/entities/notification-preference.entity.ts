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

@Entity('notification_preferences')
@Index(['userId', 'eventType'], { unique: true })
export class NotificationPreference extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 32 })
  eventType!: string;

  @Column({ default: true })
  receivePush!: boolean;

  @Column({ default: true })
  receiveEmail!: boolean;

  @Column({ default: false })
  receiveSms!: boolean;

  @Column({ type: 'varchar', length: 16, default: 'immediate' })
  frequency!: string;
}
