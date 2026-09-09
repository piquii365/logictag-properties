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

export enum DocumentStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

@Entity('documents')
export class Document extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'organization_id', nullable: true })
  organizationId!: string | null;

  @Column({ type: 'varchar', length: 32 })
  documentType!: string;

  @Column({ type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ type: 'varchar', length: 512 })
  filePath!: string;

  @Column({ type: 'varchar', length: 64 })
  mimeType!: string;

  @Column({ type: 'bigint' })
  fileSize!: string;

  @Column({ type: 'int', default: 1 })
  currentVersion!: number;

  @Column({ type: 'varchar', length: 16, default: DocumentStatus.ACTIVE })
  status!: DocumentStatus;

  @Column({ type: 'uuid', name: 'uploader_id' })
  uploaderId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uploader_id' })
  uploader!: User;
}
