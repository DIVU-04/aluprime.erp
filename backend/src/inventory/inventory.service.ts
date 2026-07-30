import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem } from '../entities/inventory-item.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem) private readonly inventoryRepo: Repository<InventoryItem>,
  ) {}

  findAll(type?: string) {
    const where = type ? { inventoryType: type } : {};
    return this.inventoryRepo.find({ where, order: { name: 'ASC' } });
  }

  findOne(id: string) {
    return this.inventoryRepo.findOne({ where: { id } });
  }

  create(data: Partial<InventoryItem>) {
    return this.inventoryRepo.save(this.inventoryRepo.create(data));
  }

  async update(id: string, data: Partial<InventoryItem>) {
    await this.inventoryRepo.update(id, data);
    return this.findOne(id);
  }

  async adjustStock(id: string, quantity: number, _reason?: string) {
    const item = await this.findOne(id);
    if (!item) return null;
    item.quantityOnHand = Number(item.quantityOnHand) + quantity;
    return this.inventoryRepo.save(item);
  }

  async remove(id: string) {
    await this.inventoryRepo.delete(id);
    return { deleted: true };
  }
}
