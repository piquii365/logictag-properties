import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { TenantStatus } from '../../common/enums/leasing.enum';

/** A renter's CRM record. Optionally linked to a login (`userId`), since not
 * every tenant a landlord manages has (or needs) an account. */
@Entity('tenants')
export class Tenant extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @Column({ length: 100 })
  firstName!: string;

  @Column({ length: 100 })
  lastName!: string;

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Index()
  @Column({ length: 32 })
  phone!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  nationalId!: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  emergencyContactName!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  emergencyContactPhone!: string | null;

  @Column({ length: 16, default: TenantStatus.ACTIVE })
  status!: TenantStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
