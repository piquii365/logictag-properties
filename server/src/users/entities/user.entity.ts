import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  BeforeInsert,
} from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { TimestampEntity } from './base.entity';
import { UserRole } from '../../auth/enums/role.enum';
import { UserStatus } from '../enums/status.enum';
import { AuthProvider } from '../../auth/enums/auth-provider.enum';
import { Property } from '../../properties/entities/property.entity';
import { Unit } from '../../properties/entities/unit.entity';

@Entity('users')
export class User extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  password!: string | null;

  @Column({ type: 'varchar', length: 32, default: UserRole.TENANT })
  role!: UserRole;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatarUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  hashedRefreshToken!: string | null;

  @Column({ type: 'varchar', length: 16, default: UserStatus.ACTIVE })
  status!: UserStatus;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
    name: 'auth_provider',
  })
  authProvider!: AuthProvider;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'provider_id' })
  providerId?: string;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerifiedAt!: Date | null;

  /** Email awaiting confirmation before it replaces `email`. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  pendingEmail!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  emailChangeToken!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  emailChangeTokenExpiration!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  passwordResetToken!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  passwordResetTokenExpiration!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt!: Date | null;

  /** Properties this user owns (landlord / property manager). */
  @OneToMany(() => Property, (property) => property.owner)
  ownedProperties!: Property[];

  /** Units this user rents (tenant). */
  @OneToMany(() => Unit, (unit) => unit.tenant)
  rentedUnits!: Unit[];

  @BeforeInsert()
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }
}
