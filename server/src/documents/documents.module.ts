import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { Document } from './entities/document.entity';
import { DocumentLink } from './entities/document-link.entity';
import { DocumentVersion } from './entities/document-version.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, DocumentVersion, DocumentLink]),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
