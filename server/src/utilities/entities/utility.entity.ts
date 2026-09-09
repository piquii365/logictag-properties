import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';
import { Property } from '../../properties/entities/property.entity';
import { BillingMethod } from '../../common/enums/utilities.enum';

@Entity('utilities')
export class Utility extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'property_id' })
  propertyId!: string;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @Column({ length: 80 })
  name!: string;

  @Column({ length: 32 })
  type!: string;

  @Column({ length: 24 })
  billingMethod!: BillingMethod;

  @Column({ type: 'varchar', length: 24, nullable: true })
  apportionBasis!: string | null;

  @Column({ default: true })
  isActive!: boolean;
}
