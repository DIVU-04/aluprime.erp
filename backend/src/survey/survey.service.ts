import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Survey } from '../entities/survey.entity';

@Injectable()
export class SurveyService {
  constructor(
    @InjectRepository(Survey) private readonly surveyRepo: Repository<Survey>,
  ) {}

  findAll() {
    return this.surveyRepo.find({ order: { createdAt: 'DESC' } });
  }

  findOne(id: string) {
    return this.surveyRepo.findOne({ where: { id } });
  }

  create(data: Partial<Survey>) {
    return this.surveyRepo.save(this.surveyRepo.create(data));
  }

  async update(id: string, data: Partial<Survey>) {
    await this.surveyRepo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.surveyRepo.delete(id);
    return { deleted: true };
  }
}
