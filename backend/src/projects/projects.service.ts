import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private readonly projectsRepo: Repository<Project>,
  ) {}

  findAll() {
    return this.projectsRepo.find({ order: { createdAt: 'DESC' } });
  }

  findOne(id: string) {
    return this.projectsRepo.findOne({ where: { id } });
  }

  async create(data: Partial<Project>) {
    const count = await this.projectsRepo.count();
    const code = data.code || `PRJ-${String(count + 1).padStart(4, '0')}`;
    return this.projectsRepo.save(this.projectsRepo.create({ ...data, code }));
  }

  async update(id: string, data: Partial<Project>) {
    await this.projectsRepo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.projectsRepo.delete(id);
    return { deleted: true };
  }
}
