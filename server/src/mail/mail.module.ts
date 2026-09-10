import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

/**
 * Global so any feature module can inject MailService without importing this
 * module explicitly — the same pattern AppConfigModule uses.
 */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
