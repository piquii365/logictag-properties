import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';

@Entity('zimra_profiles')
export class ZimraProfile extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @Index({ unique: true })
  @Column({ length: 32 })
  tin!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  taxpayerName!: string | null;

  @Column({ type: 'varchar', length: 32 })
  taxpayerType!: string;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  registrationStatus!: string;

  @Column({ type: 'date', nullable: true })
  registrationDate!: string | null;

  @Column({ default: false })
  vatRegistered!: boolean;

  @Column({ type: 'varchar', length: 32, nullable: true })
  vatNumber!: string | null;

  @Column({ default: false })
  presumptiveRentalRegistered!: boolean;

  @Column({ type: 'varchar', length: 32, nullable: true })
  itf263Number!: string | null;

  @Column({ type: 'int', default: 12 })
  taxYearEndMonth!: number;

  /** Uploaded ZIMRA / compliance documents (e.g. ITF263, VAT certificates).
   * Each entry: { id, name, url, mime, sizeBytes, uploadedAt, documentType }. */
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  documents!: Array<{
    id: string;
    name: string;
    url: string;
    mime: string;
    sizeBytes: number;
    uploadedAt: string;
    documentType?: string;
  }>;
}
