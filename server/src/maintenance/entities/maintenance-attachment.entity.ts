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

export type MaintenanceAttachableType = 'request' | 'quote' | 'job';

@Entity('maintenance_attachments')
export class MaintenanceAttachment extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 16 })
  attachableType!: MaintenanceAttachableType;

  @Index()
  @Column({ type: 'uuid' })
  attachableId!: string;

  @Column({ length: 32 })
  disk!: string;

  @Column({ length: 512 })
  path!: string;

  @Column({ length: 255 })
  originalName!: string;

  @Column({ length: 128 })
  mime!: string;

  @Column({ type: 'bigint' })
  sizeBytes!: string;

  @Column({ type: 'uuid', name: 'uploaded_by_user_id' })
  uploadedByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploadedBy!: User;
}
