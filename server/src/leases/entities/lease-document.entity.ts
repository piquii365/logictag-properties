import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';
import { Lease } from './lease.entity';
import { User } from '../../users/entities/user.entity';

@Entity('lease_documents')
export class LeaseDocument extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'lease_id' })
  leaseId!: string;

  @ManyToOne(() => Lease, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lease_id' })
  lease!: Lease;

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

  @Column({ length: 32 })
  type!: string;

  @Column({ type: 'uuid', name: 'uploaded_by_user_id' })
  uploadedByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploadedBy!: User;
}
