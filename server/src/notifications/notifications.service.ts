import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { UserRole } from '../auth/enums/role.enum';
import { OWNER_ROLES, seesEverything } from '../common/access';
import { MailService } from '../mail/mail.service';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { LeaseTenant } from '../leases/entities/lease-tenant.entity';
import { Lease } from '../leases/entities/lease.entity';
import { Unit } from '../properties/entities/unit.entity';
import { Property } from '../properties/entities/property.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { ReplyNotificationDto } from './dto/reply-notification.dto';
import { NotificationPreferenceDto } from './dto/notification-preference.dto';
import { Notification } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';

@Injectable()
export class NotificationsService {
  private readonly notifications: Repository<Notification>;
  private readonly preferences: Repository<NotificationPreference>;
  private readonly users: Repository<User>;
  private readonly dataSource: DataSource;

  constructor(
    dataSource: DataSource,
    private readonly mail: MailService,
  ) {
    this.dataSource = dataSource;
    this.notifications = dataSource.getRepository(Notification);
    this.preferences = dataSource.getRepository(NotificationPreference);
    this.users = dataSource.getRepository(User);
  }

  async create(user: AuthJwtPayload, dto: CreateNotificationDto) {
    this.assertBackOffice(user);
    const notification = await this.notifications.save(
      this.notifications.create({
        ...dto,
        entityType: dto.entityType ?? null,
        entityId: dto.entityId ?? null,
        read: false,
        readAt: null,
      }),
    );
    await this.sendEmail(notification);
    return notification;
  }

  async createSystemNotification(dto: CreateNotificationDto) {
    const notification = await this.notifications.save(
      this.notifications.create({
        ...dto,
        entityType: dto.entityType ?? null,
        entityId: dto.entityId ?? null,
        read: false,
        readAt: null,
      }),
    );
    await this.sendEmail(notification);
    return notification;
  }

  /** Candidate tenant/vendor users a management user can message. Landlords and
   * property managers only see tenants on properties they own; vendors are
   * global (approved centrally), so every vendor user is listed. */
  async listRecipients(user: AuthJwtPayload) {
    this.assertManagement(user);
    const tenantUserIds = await this.tenantUserIdsFor(user);
    const vendorUserIds = await this.vendorUserIds();
    const ids = [...new Set([...tenantUserIds, ...vendorUserIds])];
    if (ids.length === 0) return [];
    const users = await this.users.find({
      where: { id: In(ids) },
      select: { id: true, name: true, email: true, role: true },
    });
    return users.sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Management → a set of chosen recipients. Each recipient must be a tenant
   * or vendor the sender is allowed to reach. */
  async sendToMany(user: AuthJwtPayload, dto: SendNotificationDto) {
    this.assertManagement(user);
    const allowed = await this.allowedRecipientIds(user);
    const recipients = dto.userIds.filter((id) => allowed.has(id));
    if (recipients.length === 0) {
      throw new ForbiddenException(
        'None of the selected recipients can receive notices',
      );
    }
    const created: Notification[] = [];
    for (const userId of recipients) {
      const notification = await this.notifications.save(
        this.notifications.create({
          userId,
          eventType: dto.eventType,
          subject: dto.subject,
          body: dto.body,
          entityType: dto.entityType ?? null,
          entityId: dto.entityId ?? null,
          read: false,
          readAt: null,
        }),
      );
      created.push(notification);
      await this.sendEmail(notification);
    }
    return created;
  }

  /** Tenant/vendor → every management user (landlord, PM, staff, admin). */
  async replyToManagement(user: AuthJwtPayload, dto: ReplyNotificationDto) {
    if (
      OWNER_ROLES.includes(user.role) ||
      user.role === UserRole.STAFF ||
      seesEverything(user)
    ) {
      throw new ForbiddenException(
        'Use the recipient picker to send notices to tenants and vendors',
      );
    }
    const managers = await this.users.find({
      where: {
        role: In([
          UserRole.LANDLORD,
          UserRole.PROPERTY_MANAGER,
          UserRole.STAFF,
          UserRole.ADMIN,
        ]),
      },
      select: { id: true },
    });
    const created: Notification[] = [];
    for (const manager of managers) {
      const notification = await this.notifications.save(
        this.notifications.create({
          userId: manager.id,
          eventType: dto.eventType,
          subject: dto.subject,
          body: dto.body,
          entityType: dto.entityType ?? null,
          entityId: dto.entityId ?? null,
          read: false,
          readAt: null,
        }),
      );
      created.push(notification);
      await this.sendEmail(notification);
    }
    return created;
  }

  list(user: AuthJwtPayload) {
    return this.notifications.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async markRead(user: AuthJwtPayload, id: string) {
    const notification = await this.notifications.findOne({ where: { id } });
    if (!notification || notification.userId !== user.id) {
      throw new NotFoundException('Notification not found');
    }
    notification.read = true;
    notification.readAt = new Date();
    return this.notifications.save(notification);
  }

  listPreferences(user: AuthJwtPayload) {
    return this.preferences.find({
      where: { userId: user.id },
      order: { eventType: 'ASC' },
    });
  }

  async setPreference(user: AuthJwtPayload, dto: NotificationPreferenceDto) {
    const existing = await this.preferences.findOne({
      where: { userId: user.id, eventType: dto.eventType },
    });
    const preference =
      existing ??
      this.preferences.create({ userId: user.id, eventType: dto.eventType });
    Object.assign(preference, {
      receivePush: dto.receivePush ?? preference.receivePush ?? true,
      receiveEmail: dto.receiveEmail ?? preference.receiveEmail ?? true,
      receiveSms: dto.receiveSms ?? preference.receiveSms ?? false,
      frequency: dto.frequency ?? preference.frequency ?? 'immediate',
    });
    return this.preferences.save(preference);
  }

  private assertBackOffice(user: AuthJwtPayload) {
    if (!seesEverything(user) && user.role !== UserRole.STAFF) {
      throw new ForbiddenException(
        'Only back-office users can send notifications',
      );
    }
  }

  /** Landlords, property managers, staff and admins may broadcast notices. */
  private assertManagement(user: AuthJwtPayload) {
    if (
      !OWNER_ROLES.includes(user.role) &&
      user.role !== UserRole.STAFF &&
      !seesEverything(user)
    ) {
      throw new ForbiddenException(
        'Only management can send notices to tenants and vendors',
      );
    }
  }

  /** Tenant user ids the sender may message. Landlords/PMs are scoped to
   * tenants on properties they own; staff/admins see every tenant user. */
  private async tenantUserIdsFor(user: AuthJwtPayload): Promise<string[]> {
    const tenants = this.dataSource.getRepository(Tenant);
    let qb = tenants
      .createQueryBuilder('tenant')
      .innerJoin(LeaseTenant, 'lt', 'lt.tenant_id = tenant.id')
      .innerJoin(Lease, 'lease', 'lease.id = lt.lease_id')
      .innerJoin(Unit, 'unit', 'unit.id = lease.unit_id')
      .innerJoin(Property, 'property', 'property.id = unit.property_id')
      .where('tenant.user_id IS NOT NULL');
    if (OWNER_ROLES.includes(user.role)) {
      qb = qb.andWhere('property.owner_id = :ownerId', { ownerId: user.id });
    }
    const rows = await qb
      .select('DISTINCT tenant.user_id', 'userId')
      .getRawMany<{ userId: string }>();
    return rows.map((r) => r.userId);
  }

  /** Every vendor user (vendors are global, approved centrally). */
  private async vendorUserIds(): Promise<string[]> {
    const vendors = this.dataSource.getRepository(Vendor);
    const rows = await vendors
      .createQueryBuilder('vendor')
      .where('vendor.user_id IS NOT NULL')
      .select('DISTINCT vendor.user_id', 'userId')
      .getRawMany<{ userId: string }>();
    return rows.map((r) => r.userId);
  }

  /** Full set of user ids the sender may target with a notice. */
  private async allowedRecipientIds(
    user: AuthJwtPayload,
  ): Promise<Set<string>> {
    const ids = [
      ...(await this.tenantUserIdsFor(user)),
      ...(await this.vendorUserIds()),
    ];
    return new Set(ids);
  }

  private async sendEmail(notification: Notification) {
    if (!this.mail.isConfigured) return;

    const preference = await this.preferences.findOne({
      where: {
        userId: notification.userId,
        eventType: notification.eventType,
      },
    });
    if (
      preference?.receiveEmail === false ||
      preference?.frequency === 'never'
    ) {
      return;
    }

    const user = await this.users.findOne({
      where: { id: notification.userId },
    });
    if (!user?.email) return;

    await this.mail.send({
      to: user.email,
      subject: notification.subject,
      text: notification.body,
    });
  }
}
