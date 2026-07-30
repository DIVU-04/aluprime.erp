import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quotation } from '../entities/quotation.entity';
import { QuotationItem } from '../entities/quotation-item.entity';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Quotation, QuotationItem])],
  controllers: [QuotationsController],
  providers: [QuotationsService],
})
export class QuotationsModule {}
