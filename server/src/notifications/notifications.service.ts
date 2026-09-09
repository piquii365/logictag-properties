import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { createTransport } from 'nodemailer';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { UserRole } from '../auth/enums/role.enum';
import { seesEverything } from '../common/access';
import { ConfigService } from '../config/config.service';
import { User } from '../users/entities/user.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationPreferenceDto } from './dto/notification-preference.dto';
import { Notification } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';

@Injectable()
export class NotificationsService {
  private readonly notifications: Repository<Notification>;
  private readonly preferences: Repository<NotificationPreference>;
  private readonly users: Repository<User>;

  constructor(
    dataSource: DataSource,
    private readonly config: ConfigService,
  ) {
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

  private async sendEmail(notification: Notification) {
    if (!this.config.isSmtpConfigured) return;

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

    const transporter = createTransport({
      host: this.config.smtpHost,
      port: this.config.smtpPort,
      secure: this.config.smtpSecure,
      ...(this.config.smtpUser && this.config.smtpPassword
        ? {
            auth: {
              user: this.config.smtpUser,
              pass: this.config.smtpPassword,
            },
          }
        : {}),
    });

    try {
      await transporter.sendMail({
        from: this.config.smtpFrom,
        to: user.email,
        subject: notification.subject,
        text: notification.body,
      });
    } catch (error) {
      console.error('SMTP notification delivery failed', error);
    }
  }
}
