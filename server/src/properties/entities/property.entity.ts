import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Unit } from './unit.entity';

@Entity('properties')
export class Property extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  address!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  city!: string | null;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ type: 'jsonb', default: [] })
  imageUrls!: string[];

  /**
   * The landlord / property manager who owns this property. Every read and
   * write in PropertiesService is scoped through this column (or through
   * Unit.tenantId for tenants), so it must never be nullable.
   */
  @Index()
  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId!: string;

  @ManyToOne(() => User, (user) => user.ownedProperties, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'owner_id' })
  owner!: User;

  @OneToMany(() => Unit, (unit) => unit.property, { cascade: ['insert'] })
  units!: Unit[];
}
