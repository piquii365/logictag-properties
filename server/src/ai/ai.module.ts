import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiInsight } from './entities/ai-insight.entity';
import { AiRequestLog } from './entities/ai-request-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AiInsight, AiRequestLog])],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
