import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalesOrder } from '../entities/sales-order.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(SalesOrder) private readonly ordersRepo: Repository<SalesOrder>,
  ) {}

  findAll() {
    return this.ordersRepo.find({ order: { createdAt: 'DESC' } });
  }

  findOne(id: string) {
    return this.ordersRepo.findOne({ where: { id } });
  }

  async create(data: Partial<SalesOrder>) {
    const count = await this.ordersRepo.count();
    const orderNumber = data.orderNumber || `SO-${String(count + 1).padStart(5, '0')}`;
    return this.ordersRepo.save(
      this.ordersRepo.create({
        ...data,
        orderNumber,
        orderDate: data.orderDate || new Date().toISOString().split('T')[0],
      }),
    );
  }

  async update(id: string, data: Partial<SalesOrder>) {
    await this.ordersRepo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.ordersRepo.delete(id);
    return { deleted: true };
  }
}
