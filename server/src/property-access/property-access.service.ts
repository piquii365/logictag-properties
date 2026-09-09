import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PropertyOwner } from './entities/property-owner.entity';
import { PropertyUser } from './entities/property-user.entity';
import { Property } from '../properties/entities/property.entity';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { AddPropertyOwnerDto } from './dto/add-property-owner.dto';
import { AddPropertyUserDto } from './dto/add-property-user.dto';
import { seesEverything } from '../common/access';

/** Only the property's registered owner or an admin may grant co-owner or
 * staff access to it — not staff/PM themselves, so nobody can hand
 * themselves broader access than they were given. */
@Injectable()
export class PropertyAccessService {
  private properties: Repository<Property>;
  private owners: Repository<PropertyOwner>;
  private users: Repository<PropertyUser>;

  constructor(private readonly dataSource: DataSource) {
    this.properties = dataSource.getRepository(Property);
    this.owners = dataSource.getRepository(PropertyOwner);
    this.users = dataSource.getRepository(PropertyUser);
  }

  async listOwners(
    user: AuthJwtPayload,
    propertyId: string,
  ): Promise<PropertyOwner[]> {
    await this.assertManagesProperty(user, propertyId);
    return this.owners.find({ where: { propertyId } });
  }

  async addOwner(
    user: AuthJwtPayload,
    propertyId: string,
    dto: AddPropertyOwnerDto,
  ): Promise<PropertyOwner> {
    await this.assertManagesProperty(user, propertyId);
    return this.owners.save(
      this.owners.create({
        propertyId,
        userId: dto.userId,
        ownershipShare: dto.ownershipShare?.toString() ?? '100',
        isPrimary: dto.isPrimary ?? false,
      }),
    );
  }

  async removeOwner(
    user: AuthJwtPayload,
    propertyId: string,
    userId: string,
  ): Promise<{ id: string }> {
    await this.assertManagesProperty(user, propertyId);
    await this.owners.delete({ propertyId, userId });
    return { id: userId };
  }

  async listUsers(
    user: AuthJwtPayload,
    propertyId: string,
  ): Promise<PropertyUser[]> {
    await this.assertManagesProperty(user, propertyId);
    return this.users.find({ where: { propertyId } });
  }

  async addUser(
    user: AuthJwtPayload,
    propertyId: string,
    dto: AddPropertyUserDto,
  ): Promise<PropertyUser> {
    await this.assertManagesProperty(user, propertyId);
    return this.users.save(
      this.users.create({ propertyId, userId: dto.userId, role: dto.role }),
    );
  }

  async removeUser(
    user: AuthJwtPayload,
    propertyId: string,
    userId: string,
  ): Promise<{ id: string }> {
    await this.assertManagesProperty(user, propertyId);
    await this.users.delete({ propertyId, userId });
    return { id: userId };
  }

  private async assertManagesProperty(
    user: AuthJwtPayload,
    propertyId: string,
  ) {
    if (seesEverything(user)) return;
    const property = await this.properties.findOne({
      where: { id: propertyId },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (property.ownerId !== user.id) {
      throw new ForbiddenException('Only the property owner can manage access');
    }
  }
}
