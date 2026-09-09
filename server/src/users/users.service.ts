import { Injectable } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import {
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { hash } from 'bcryptjs';
import { UserRole } from './../auth/enums/role.enum';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { UserStatus } from './enums/status.enum';
import { AuthProvider } from '../auth/enums/auth-provider.enum';
import { OAuthProfile } from '../auth/types/oauth-profile';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuditService } from '../audit/audit.service';

/**
 * Columns safe to return over HTTP. Secrets are `select: false` on the entity,
 * but listing the safe set keeps responses stable and small.
 */
const PUBLIC_FIELDS = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  avatarUrl: true,
} as const;

@Injectable()
export class UsersService {
  private userRepository: Repository<User>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {
    this.userRepository = this.dataSource.getRepository(User);
  }

  async create(createUserDto: CreateUserDto) {
    const email = createUserDto.email.trim().toLowerCase();
    const existing = await this.userRepository.findOne({ where: { email } });

    if (existing) {
      throw new ConflictException('Email already exists');
    }

    // Nobody self-assigns ADMIN: it is granted out of band.
    if (createUserDto.role === UserRole.ADMIN) {
      throw new ForbiddenException('Cannot self-assign the admin role');
    }

    const user = this.userRepository.create({
      ...createUserDto,
      email,
      role: createUserDto.role ?? UserRole.TENANT,
      authProvider: AuthProvider.LOCAL,
      status: UserStatus.ACTIVE,
    });

    const saved = await this.userRepository.save(user);
    return this.findOne(saved.id);
  }

  async findAll(
    currentUser?: AuthJwtPayload,
    filters?: {
      role?: UserRole;
      status?: UserStatus;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    // Admins see the whole directory (optionally filtered); everyone else
    // sees only themselves.
    if (currentUser?.role === UserRole.ADMIN) {
      const page = filters?.page ?? 1;
      const limit = filters?.limit ?? 50;
      const qb = this.userRepository
        .createQueryBuilder('user')
        .select(Object.keys(PUBLIC_FIELDS).map((k) => `user.${k}`))
        .orderBy('user.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      if (filters?.role) {
        qb.andWhere('user.role = :role', { role: filters.role });
      }
      if (filters?.status) {
        qb.andWhere('user.status = :status', { status: filters.status });
      }
      if (filters?.search) {
        qb.andWhere(
          '(LOWER(user.name) LIKE LOWER(:q) OR LOWER(user.email) LIKE LOWER(:q))',
          { q: `%${filters.search}%` },
        );
      }

      const [items, total] = await qb.getManyAndCount();
      return { items, total, page, limit };
    }
    if (!currentUser) {
      throw new ForbiddenException('Not authenticated');
    }
    return await this.userRepository.find({
      where: { id: currentUser.id },
      select: PUBLIC_FIELDS,
    });
  }

  findOne(id: string) {
    return this.userRepository.findOne({
      where: { id },
      select: PUBLIC_FIELDS,
    });
  }

  async findOrCreateOAuthUser(profile: OAuthProfile): Promise<User> {
    const email = profile.email.trim().toLowerCase();
    const name =
      profile.displayName ||
      `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() ||
      email;

    let user = await this.findByProviderId(
      profile.provider,
      profile.providerId,
    );
    if (user) {
      user.name = name;
      user.avatarUrl = profile.avatarUrl;
      return this.userRepository.save(user);
    }
    // Same email, previously registered locally -> link the OAuth identity.
    user = await this.findByEmail(email);
    if (user) {
      user.providerId = profile.providerId;
      user.name = name;
      user.authProvider = profile.provider;
      user.avatarUrl = profile.avatarUrl;
      return this.userRepository.save(user);
    }

    return this.userRepository.save(
      this.userRepository.create({
        email,
        password: null,
        providerId: profile.providerId,
        authProvider: profile.provider,
        name,
        avatarUrl: profile.avatarUrl,
        role: UserRole.TENANT,
        status: UserStatus.ACTIVE,
      }),
    );
  }

  async findByEmail(email: string) {
    return await this.userRepository.findOne({
      where: { email: email.trim().toLowerCase() },
    });
  }

  /** Login path only: `password` is `select: false` and must be asked for. */
  async findByEmailWithSecrets(email: string) {
    return await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('LOWER(user.email) = LOWER(:email)', { email: email.trim() })
      .getOne();
  }

  async updateHashedRefreshToken(
    id: string,
    hashedRefreshToken: string | null,
  ) {
    return await this.userRepository.update({ id }, { hashedRefreshToken });
  }

  async getUserRefreshToken(id: string) {
    return await this.userRepository.findOne({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        hashedRefreshToken: true,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.preload({ id, ...updateUserDto });
    if (!user) {
      throw new NotFoundException(`User not found`);
    }
    await this.userRepository.save(user);
    return this.findOne(id);
  }

  /** Admin-only role change. */
  async setRole(id: string, role: UserRole, actorId?: string) {
    const result = await this.userRepository.update({ id }, { role });
    if (!result.affected) {
      throw new NotFoundException(`User not found`);
    }
    if (actorId) {
      await this.audit.record({
        userId: actorId,
        action: 'user.role_changed',
        entityType: 'user',
        entityId: id,
        changes: { role },
        metadata: null,
        ipAddress: null,
        userAgent: null,
      });
    }
    return this.findOne(id);
  }

  /** Admin-only status change (suspend / reactivate). Suspended users are
   * blocked at login by the auth service. */
  async setStatus(id: string, status: UserStatus, actorId?: string) {
    const result = await this.userRepository.update({ id }, { status });
    if (!result.affected) {
      throw new NotFoundException(`User not found`);
    }
    if (actorId) {
      await this.audit.record({
        userId: actorId,
        action: 'user.status_changed',
        entityType: 'user',
        entityId: id,
        changes: { status },
        metadata: null,
        ipAddress: null,
        userAgent: null,
      });
    }
    return this.findOne(id);
  }

  async findOneById(id: string) {
    return await this.userRepository.findOne({ where: { id } });
  }

  /** Password-change path only: needs the current hash to verify against. */
  async findOneByIdWithSecrets(id: string) {
    return await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();
  }

  async changePassword(id: string, newPassword: string) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User not found`);
    }
    user.password = await hash(newPassword, 10);
    // Changing the password ends every existing session and burns the reset
    // token, so a leaked token cannot be replayed afterwards.
    user.hashedRefreshToken = null;
    user.passwordResetToken = null;
    user.passwordResetTokenExpiration = null;
    await this.userRepository.save(user);
    return this.findOne(id);
  }

  /** Reset path only: needs the stored token hash + expiry. */
  async getUserForPasswordReset(email: string) {
    return await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordResetToken')
      .where('LOWER(user.email) = LOWER(:email)', { email: email.trim() })
      .getOne();
  }

  async setPasswordResetToken(id: string, tokenHash: string, expiresAt: Date) {
    const result = await this.userRepository.update(
      { id },
      {
        passwordResetToken: tokenHash,
        passwordResetTokenExpiration: expiresAt,
      },
    );
    if (!result.affected) {
      throw new NotFoundException(`User not found`);
    }
  }

  /** Stages a new email pending confirmation. Throws if the address is taken. */
  async stageEmailChange(
    id: string,
    newEmail: string,
    tokenHash: string,
    expiresAt: Date,
  ) {
    const email = newEmail.trim().toLowerCase();
    const taken = await this.userRepository.findOne({ where: { email } });
    if (taken) {
      throw new ConflictException('Email already in use');
    }
    const result = await this.userRepository.update(
      { id },
      {
        pendingEmail: email,
        emailChangeToken: tokenHash,
        emailChangeTokenExpiration: expiresAt,
      },
    );
    if (!result.affected) {
      throw new NotFoundException(`User not found`);
    }
  }

  /** Confirm path only: needs the stored token hash + expiry + pending email. */
  async getUserForEmailChange(tokenHash: string) {
    return await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.emailChangeToken')
      .where('user.emailChangeToken = :tokenHash', { tokenHash })
      .getOne();
  }

  /** Applies the staged email and clears the change token. */
  async applyEmailChange(id: string) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User not found`);
    }
    if (!user.pendingEmail) {
      throw new BadRequestException('No pending email change');
    }
    user.email = user.pendingEmail;
    user.pendingEmail = null;
    user.emailChangeToken = null;
    user.emailChangeTokenExpiration = null;
    user.emailVerifiedAt = new Date();
    await this.userRepository.save(user);
    return this.findOne(id);
  }

  async touchLastLogin(id: string) {
    await this.userRepository.update({ id }, { lastLoginAt: new Date() });
  }

  remove(id: string) {
    return this.userRepository.delete({ id });
  }

  async updateAvatar(id: string, file: Express.Multer.File) {
    const result = await this.userRepository.update(
      { id },
      { avatarUrl: `/uploads/avatars/${file.filename}` },
    );
    if (!result.affected) {
      throw new NotFoundException(`User not found`);
    }
    return this.findOne(id);
  }

  async findByProviderId(
    provider: AuthProvider,
    providerId: string,
  ): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { authProvider: provider, providerId },
    });
  }
}
