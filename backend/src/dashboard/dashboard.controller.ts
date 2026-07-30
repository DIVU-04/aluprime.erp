import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../entities/account.entity';
import { Opportunity } from '../entities/opportunity.entity';
import { Quotation } from '../entities/quotation.entity';
import { SalesOrder } from '../entities/sales-order.entity';
import { ProductionBatch } from '../entities/production-batch.entity';
import { Dispatch } from '../entities/dispatch.entity';
import { Project } from '../entities/project.entity';

@Controller('api/dashboard')
@UseGuards(AuthGuard('jwt'))
export class DashboardController {
  constructor(
    @InjectRepository(Account) private readonly accountsRepo: Repository<Account>,
    @InjectRepository(Opportunity) private readonly opportunitiesRepo: Repository<Opportunity>,
    @InjectRepository(Quotation) private readonly quotationsRepo: Repository<Quotation>,
    @InjectRepository(SalesOrder) private readonly ordersRepo: Repository<SalesOrder>,
    @InjectRepository(ProductionBatch) private readonly batchesRepo: Repository<ProductionBatch>,
    @InjectRepository(Dispatch) private readonly dispatchRepo: Repository<Dispatch>,
    @InjectRepository(Project) private readonly projectsRepo: Repository<Project>,
  ) {}

  @Get()
  async getOverview() {
    const [
      accounts,
      opportunities,
      quotations,
      orders,
      batches,
      dispatches,
      projects,
    ] = await Promise.all([
      this.accountsRepo.count(),
      this.opportunitiesRepo.find(),
      this.quotationsRepo.find(),
      this.ordersRepo.find(),
      this.batchesRepo.find(),
      this.dispatchRepo.find(),
      this.projectsRepo.find(),
    ]);

    const pipelineValue = opportunities.reduce((sum, o) => sum + Number(o.value), 0);
    const quotationValue = quotations.reduce((sum, q) => sum + Number(q.total), 0);
    const orderValue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    return {
      summary: {
        accounts,
        opportunities: opportunities.length,
        quotations: quotations.length,
        orders: orders.length,
        projects: projects.length,
        batches: batches.length,
        dispatches: dispatches.length,
      },
      financials: {
        pipelineValue,
        quotationValue,
        orderValue,
      },
      production: {
        scheduled: batches.filter((b) => b.status === 'scheduled').length,
        inProgress: batches.filter((b) => b.status === 'in_progress').length,
        completed: batches.filter((b) => b.status === 'completed').length,
      },
      recentQuotations: quotations.slice(0, 5).map((q) => ({
        id: q.id,
        quoteNumber: q.quoteNumber,
        customerName: q.customerName,
        total: q.total,
        status: q.status,
      })),
    };
  }
}
