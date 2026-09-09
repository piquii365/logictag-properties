import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Lease } from './lease.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

/** Join table: who is on a lease. A lease can have several tenants (e.g. co-
 * renters); exactly one of them is flagged primary for correspondence. */
@Entity('lease_tenants')
@Unique(['leaseId', 'tenantId'])
export class LeaseTenant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'lease_id' })
  leaseId!: string;

  @ManyToOne(() => Lease, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lease_id' })
  lease!: Lease;

  @Index()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ default: false })
  isPrimary!: boolean;
}
