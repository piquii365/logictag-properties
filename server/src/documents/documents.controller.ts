import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { CreateDocumentDto } from './dto/create-document.dto';
import { CreateDocumentVersionDto } from './dto/create-document-version.dto';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post()
  create(@CurrentUser() user: AuthJwtPayload, @Body() dto: CreateDocumentDto) {
    return this.documents.create(user, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthJwtPayload,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.documents.findAll(user, entityType, entityId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documents.findOne(user, id);
  }

  @Get(':id/versions')
  listVersions(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documents.listVersions(user, id);
  }

  @Post(':id/versions')
  createVersion(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDocumentVersionDto,
  ) {
    return this.documents.createVersion(user, id, dto);
  }

  @Patch(':id/archive')
  archive(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documents.archive(user, id);
  }

  @Post(':id/links')
  link(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { entityType: string; entityId: string; linkType?: string },
  ) {
    return this.documents.link(
      user,
      id,
      body.entityType,
      body.entityId,
      body.linkType,
    );
  }
}
