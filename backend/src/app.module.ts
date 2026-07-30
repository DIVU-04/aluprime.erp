import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ConfiguratorModule } from './configurator/configurator.module';
import { CrmModule } from './crm/crm.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { InventoryModule } from './inventory/inventory.module';
import { OrdersModule } from './orders/orders.module';
import { ProductionModule } from './production/production.module';
import { ProjectsModule } from './projects/projects.module';
import { QuotationsModule } from './quotations/quotations.module';
import { SeedModule } from './seed/seed.module';
import { SurveyModule } from './survey/survey.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DATABASE_PATH || 'aluprime.db',
      autoLoadEntities: true,
      synchronize: true,
    }),
    AuthModule,
    UsersModule,
    CrmModule,
    QuotationsModule,
    ProjectsModule,
    OrdersModule,
    InventoryModule,
    ProductionModule,
    DispatchModule,
    SurveyModule,
    ConfiguratorModule,
    DashboardModule,
    SeedModule,
  ],
})
export class AppModule {}
