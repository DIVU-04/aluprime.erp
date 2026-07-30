import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Account } from '../entities/account.entity';
import { Contact } from '../entities/contact.entity';
import { Opportunity } from '../entities/opportunity.entity';
import { Quotation } from '../entities/quotation.entity';
import { QuotationItem } from '../entities/quotation-item.entity';
import { Project } from '../entities/project.entity';
import { SalesOrder } from '../entities/sales-order.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { ProductionBatch } from '../entities/production-batch.entity';
import { Dispatch } from '../entities/dispatch.entity';
import { Survey } from '../entities/survey.entity';
import { Design } from '../entities/design.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Account,
      Contact,
      Opportunity,
      Quotation,
      QuotationItem,
      Project,
      SalesOrder,
      InventoryItem,
      ProductionBatch,
      Dispatch,
      Survey,
      Design,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
