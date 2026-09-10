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

/**
 * One registered WebAuthn credential (a "passkey"). A user may have several —
 * one per device — so this is a separate table rather than columns on `users`.
 */
@Entity('passkey_credentials')
export class PasskeyCredential extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  /** Base64url credential ID issued by the authenticator. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 512 })
  credentialId!: string;

  /** Base64url COSE public key. */
  @Column({ type: 'text' })
  publicKey!: string;

  /** Signature counter, used to detect cloned authenticators. */
  @Column({ type: 'bigint', default: 0 })
  counter!: string;

  /** Authenticator transports (usb, nfc, ble, internal, hybrid). */
  @Column({ type: 'simple-array', nullable: true })
  transports!: string[] | null;

  /** Human-friendly label so a user can tell their devices apart. */
  @Column({ type: 'varchar', length: 120, nullable: true })
  deviceName!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt!: Date | null;
}
