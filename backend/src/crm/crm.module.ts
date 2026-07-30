import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../entities/account.entity';
import { Contact } from '../entities/contact.entity';
import { Opportunity } from '../entities/opportunity.entity';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';

@Module({
  imports: [TypeOrmModule.forFeature([Account, Contact, Opportunity])],
  controllers: [CrmController],
  providers: [CrmService],
})
export class CrmModule {}
