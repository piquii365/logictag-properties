import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { UserRole } from '../auth/enums/role.enum';
import { seesEverything } from '../common/access';
import { CreateDocumentDto } from './dto/create-document.dto';
import { CreateDocumentVersionDto } from './dto/create-document-version.dto';
import { Document, DocumentStatus } from './entities/document.entity';
import { DocumentLink } from './entities/document-link.entity';
import { DocumentVersion } from './entities/document-version.entity';

const canManage = (user: AuthJwtPayload) =>
  seesEverything(user) ||
  user.role === UserRole.STAFF ||
  user.role === UserRole.LANDLORD ||
  user.role === UserRole.PROPERTY_MANAGER;

@Injectable()
export class DocumentsService {
  private readonly documents: Repository<Document>;
  private readonly versions: Repository<DocumentVersion>;
  private readonly links: Repository<DocumentLink>;

  constructor(private readonly dataSource: DataSource) {
    this.documents = dataSource.getRepository(Document);
    this.versions = dataSource.getRepository(DocumentVersion);
    this.links = dataSource.getRepository(DocumentLink);
  }

  async create(user: AuthJwtPayload, dto: CreateDocumentDto) {
    this.assertCanManage(user);
    const document = await this.dataSource.transaction(async (manager) => {
      const created = await manager.save(
        manager.create(Document, {
          organizationId: dto.organizationId ?? null,
          documentType: dto.documentType,
          fileName: dto.fileName,
          filePath: dto.filePath,
          mimeType: dto.mimeType,
          fileSize: String(dto.fileSize),
          currentVersion: 1,
          status: DocumentStatus.ACTIVE,
          uploaderId: user.id,
        }),
      );
      await manager.save(
        manager.create(DocumentVersion, {
          documentId: created.id,
          versionNumber: 1,
          filePath: dto.filePath,
          uploadedBy: user.id,
          changeDescription: 'Initial upload',
        }),
      );
      if (dto.entityType && dto.entityId) {
        await manager.save(
          manager.create(DocumentLink, {
            documentId: created.id,
            entityType: dto.entityType,
            entityId: dto.entityId,
            linkType: 'primary',
          }),
        );
      }
      return created;
    });
    return document;
  }

  async findAll(user: AuthJwtPayload, entityType?: string, entityId?: string) {
    const query = this.documents
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.uploader', 'uploader')
      .where('document.status != :deleted', { deleted: DocumentStatus.DELETED })
      .orderBy('document.updatedAt', 'DESC');
    if (entityType && entityId) {
      query.innerJoin(
        DocumentLink,
        'link',
        'link.document_id = document.id AND link.entity_type = :entityType AND link.entity_id = :entityId',
        { entityType, entityId },
      );
    } else if (!seesEverything(user) && user.role !== UserRole.STAFF) {
      query.andWhere('document.uploader_id = :userId', { userId: user.id });
    }
    return query.getMany();
  }

  async findOne(user: AuthJwtPayload, id: string) {
    const document = await this.documents.findOne({ where: { id } });
    if (!document || !(await this.canView(user, document))) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  async listVersions(user: AuthJwtPayload, id: string) {
    await this.findOne(user, id);
    return this.versions.find({
      where: { documentId: id },
      order: { versionNumber: 'DESC' },
    });
  }

  async createVersion(
    user: AuthJwtPayload,
    id: string,
    dto: CreateDocumentVersionDto,
  ) {
    const document = await this.findManageable(user, id);
    return this.dataSource.transaction(async (manager) => {
      const versionNumber = document.currentVersion + 1;
      const version = await manager.save(
        manager.create(DocumentVersion, {
          documentId: id,
          versionNumber,
          filePath: dto.filePath,
          uploadedBy: user.id,
          changeDescription: dto.changeDescription ?? null,
        }),
      );
      document.currentVersion = versionNumber;
      document.filePath = dto.filePath;
      document.uploaderId = user.id;
      await manager.save(document);
      return version;
    });
  }

  async archive(user: AuthJwtPayload, id: string) {
    const document = await this.findManageable(user, id);
    document.status = DocumentStatus.ARCHIVED;
    return this.documents.save(document);
  }

  async link(
    user: AuthJwtPayload,
    id: string,
    entityType: string,
    entityId: string,
    linkType = 'supporting',
  ) {
    await this.findManageable(user, id);
    if (!entityType || !entityId) {
      throw new BadRequestException('Entity type and id are required');
    }
    return this.links.save(
      this.links.create({ documentId: id, entityType, entityId, linkType }),
    );
  }

  private async canView(user: AuthJwtPayload, document: Document) {
    return (
      seesEverything(user) ||
      user.role === UserRole.STAFF ||
      document.uploaderId === user.id
    );
  }

  private async findManageable(user: AuthJwtPayload, id: string) {
    const document = await this.findOne(user, id);
    this.assertCanManage(user);
    return document;
  }

  private assertCanManage(user: AuthJwtPayload) {
    if (!canManage(user)) {
      throw new ForbiddenException('Not allowed to manage documents');
    }
  }
}
