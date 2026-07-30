import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../entities/account.entity';
import { Opportunity } from '../entities/opportunity.entity';
import { Quotation } from '../entities/quotation.entity';
import { SalesOrder } from '../entities/sales-order.entity';
import { ProductionBatch } from '../entities/production-batch.entity';
import { Dispatch } from '../entities/dispatch.entity';
import { Project } from '../entities/project.entity';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Account,
      Opportunity,
      Quotation,
      SalesOrder,
      ProductionBatch,
      Dispatch,
      Project,
    ]),
  ],
  controllers: [DashboardController],
})
export class DashboardModule {}
