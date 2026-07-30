import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesOrder } from '../entities/sales-order.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [TypeOrmModule.forFeature([SalesOrder])],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
