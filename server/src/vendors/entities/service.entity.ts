import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';

/** Catalog of maintenance service categories (plumbing, electrical, ...). */
@Entity('services')
export class Service extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 80 })
  name!: string;

  @Index({ unique: true })
  @Column({ length: 80 })
  slug!: string;

  @Column({ length: 40 })
  category!: string;

  @Column({ default: true })
  isActive!: boolean;
}
