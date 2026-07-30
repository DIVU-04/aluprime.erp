import { Injectable } from '@nestjs/common';
import { Repository, ObjectLiteral } from 'typeorm';

@Injectable()
export class CrudService<T extends ObjectLiteral> {
  constructor(private readonly repository: Repository<T>) {}

  findAll() {
    return this.repository.find({ order: { createdAt: 'DESC' } as never });
  }

  findOne(id: string) {
    return this.repository.findOne({ where: { id } as never });
  }

  create(data: Partial<T>) {
    const entity = this.repository.create(data as never);
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<T>) {
    await this.repository.update(id, data as never);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.repository.delete(id);
    return { deleted: true };
  }
}
