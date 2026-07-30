import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispatch } from '../entities/dispatch.entity';

@Injectable()
export class DispatchService {
  constructor(
    @InjectRepository(Dispatch) private readonly dispatchRepo: Repository<Dispatch>,
  ) {}

  findAll() {
    return this.dispatchRepo.find({ order: { createdAt: 'DESC' } });
  }

  findOne(id: string) {
    return this.dispatchRepo.findOne({ where: { id } });
  }

  async create(data: Partial<Dispatch>) {
    const count = await this.dispatchRepo.count();
    const dispatchNumber = data.dispatchNumber || `DSP-${String(count + 1).padStart(5, '0')}`;
    return this.dispatchRepo.save(
      this.dispatchRepo.create({
        ...data,
        dispatchNumber,
        dispatchDate: data.dispatchDate || new Date().toISOString().split('T')[0],
      }),
    );
  }

  async update(id: string, data: Partial<Dispatch>) {
    await this.dispatchRepo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.dispatchRepo.delete(id);
    return { deleted: true };
  }
}
