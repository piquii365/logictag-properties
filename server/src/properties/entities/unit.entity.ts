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
import { Property } from './property.entity';
import { UnitStatus } from '../enums/unit-status.enum';

@Entity('units')
export class Unit extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 60 })
  label!: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  floor!: string | null;

  @Column({ type: 'int', default: 0 })
  bedrooms!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  rent!: string;

  @Column({ type: 'varchar', length: 16, default: UnitStatus.VACANT })
  status!: UnitStatus;

  @Index()
  @Column({ type: 'uuid', name: 'property_id' })
  propertyId!: string;

  @ManyToOne(() => Property, (property) => property.units, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  /** The tenant renting this unit. This is what scopes a tenant's access. */
  @Index()
  @Column({ type: 'uuid', name: 'tenant_id', nullable: true })
  tenantId!: string | null;

  @ManyToOne(() => User, (user) => user.rentedUnits, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: User | null;
}
