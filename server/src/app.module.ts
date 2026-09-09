import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './users/users.module';
import { PropertiesModule } from './properties/properties.module';
import { CommonModule } from './common/common.module';
import { AppConfigModule } from './config/config.module';
import { ConfigService } from './config/config.service';
import { TenantsModule } from './tenants/tenants.module';
import { LeasesModule } from './leases/leases.module';
import { BillingModule } from './billing/billing.module';
import { PaymentsModule } from './payments/payments.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { VendorsModule } from './vendors/vendors.module';
import { UtilitiesModule } from './utilities/utilities.module';
import { PropertyAccessModule } from './property-access/property-access.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { AuditModule } from './audit/audit.module';
import { AiModule } from './ai/ai.module';
import { AccountingModule } from './accounting/accounting.module';
import { ExpensesModule } from './expenses/expenses.module';
import { StatementsModule } from './statements/statements.module';
import { ComplianceModule } from './compliance/compliance.module';
import { DocumentsModule } from './documents/documents.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { SystemModule } from './system/system.module';

@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.dbHost,
        port: config.dbPort,
        username: config.dbUsername,
        password: config.dbPassword,
        database: config.dbName,
        autoLoadEntities: true,
        // ponytail: schema sync is fine while the model is still moving.
        // Switch to migrations before this touches a real database.
        synchronize: process.env.NODE_ENV !== 'production',
      }),
    }),
    AuthModule,
    UserModule,
    PropertiesModule,
    TenantsModule,
    LeasesModule,
    BillingModule,
    PaymentsModule,
    MaintenanceModule,
    VendorsModule,
    UtilitiesModule,
    PropertyAccessModule,
    SubscriptionsModule,
    AuditModule,
    AiModule,
    AccountingModule,
    ExpensesModule,
    StatementsModule,
    ComplianceModule,
    DocumentsModule,
    ApprovalsModule,
    NotificationsModule,
    ReportsModule,
    SystemModule,
    CommonModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
