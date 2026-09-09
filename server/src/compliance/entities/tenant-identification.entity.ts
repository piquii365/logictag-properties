import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';

@Entity('tenant_identifications')
export class TenantIdentification extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'varchar', length: 32 })
  idType!: string;

  @Column({ type: 'varchar', length: 64 })
  idNumber!: string;

  @Column({ type: 'date', nullable: true })
  idIssueDate!: string | null;

  @Column({ type: 'date', nullable: true })
  idExpiryDate!: string | null;

  @Column({ type: 'char', length: 2, default: 'ZW' })
  issuingCountry!: string;

  @Column({ type: 'uuid', nullable: true, name: 'document_id' })
  documentId!: string | null;

  @Column({ default: false })
  verified!: boolean;

  @Column({ type: 'uuid', nullable: true, name: 'verified_by' })
  verifiedBy!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'verified_by' })
  verifier!: User | null;
}
