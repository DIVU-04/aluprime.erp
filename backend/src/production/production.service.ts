import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductionBatch } from '../entities/production-batch.entity';

@Injectable()
export class ProductionService {
  constructor(
    @InjectRepository(ProductionBatch) private readonly batchesRepo: Repository<ProductionBatch>,
  ) {}

  findAllBatches() {
    return this.batchesRepo.find({ order: { createdAt: 'DESC' } });
  }

  findBatch(id: string) {
    return this.batchesRepo.findOne({ where: { id } });
  }

  async createBatch(data: Partial<ProductionBatch>) {
    const count = await this.batchesRepo.count();
    const batchNumber = data.batchNumber || `BATCH-${String(count + 1).padStart(4, '0')}`;
    return this.batchesRepo.save(this.batchesRepo.create({ ...data, batchNumber }));
  }

  async updateBatch(id: string, data: Partial<ProductionBatch>) {
    await this.batchesRepo.update(id, data);
    return this.findBatch(id);
  }

  async completeUnit(id: string) {
    const batch = await this.findBatch(id);
    if (!batch) return null;
    batch.completedUnits = Math.min(batch.completedUnits + 1, batch.totalUnits);
    if (batch.completedUnits >= batch.totalUnits) {
      batch.status = 'completed';
      batch.completionDate = new Date().toISOString().split('T')[0];
    } else {
      batch.status = 'in_progress';
    }
    return this.batchesRepo.save(batch);
  }

  async removeBatch(id: string) {
    await this.batchesRepo.delete(id);
    return { deleted: true };
  }

  async getDashboard() {
    const batches = await this.batchesRepo.find();
    return {
      totalBatches: batches.length,
      scheduled: batches.filter((b) => b.status === 'scheduled').length,
      inProgress: batches.filter((b) => b.status === 'in_progress').length,
      completed: batches.filter((b) => b.status === 'completed').length,
      totalUnits: batches.reduce((sum, b) => sum + b.totalUnits, 0),
      completedUnits: batches.reduce((sum, b) => sum + b.completedUnits, 0),
    };
  }
}
