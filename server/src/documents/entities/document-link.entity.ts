import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { TimestampEntity } from '../../users/entities/base.entity';

@Entity('document_links')
@Index(['documentId', 'entityType', 'entityId'], { unique: true })
export class DocumentLink extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'document_id' })
  documentId!: string;

  @Column({ type: 'varchar', length: 32 })
  entityType!: string;

  @Index()
  @Column({ type: 'uuid', name: 'entity_id' })
  entityId!: string;

  @Column({ type: 'varchar', length: 32, default: 'supporting' })
  linkType!: string;
}
