import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Design } from '../entities/design.entity';

@Injectable()
export class ConfiguratorService {
  constructor(
    @InjectRepository(Design) private readonly designsRepo: Repository<Design>,
  ) {}

  findAll() {
    return this.designsRepo.find({ order: { createdAt: 'DESC' } });
  }

  findOne(id: string) {
    return this.designsRepo.findOne({ where: { id } });
  }

  create(data: Partial<Design>) {
    const estimatedCost = this.estimateCost(data).totalCost;
    return this.designsRepo.save(
      this.designsRepo.create({
        ...data,
        estimatedCost,
        designJson: JSON.stringify(data),
      }),
    );
  }

  async update(id: string, data: Partial<Design>) {
    const estimatedCost = this.estimateCost(data).totalCost;
    await this.designsRepo.update(id, {
      ...data,
      estimatedCost,
      designJson: JSON.stringify(data),
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.designsRepo.delete(id);
    return { deleted: true };
  }

  estimateCost(data: Record<string, unknown>) {
    const width = Number(data.width || 1200);
    const height = Number(data.height || 1500);
    const panels = Number(data.panels || 1);
    const area = (width * height) / 1_000_000;
    const systemRates: Record<string, number> = {
      upvc: 8500,
      aluminium: 12000,
      default: 10000,
    };
    const system = String(data.system || 'upvc').toLowerCase();
    const rate = systemRates[system] || systemRates.default;
    const profileCost = area * rate * panels;
    const glassCost = area * 2500;
    const hardwareCost = panels * 1500;
    const laborCost = area * 800;
    const totalCost = Math.round(profileCost + glassCost + hardwareCost + laborCost);

    return {
      area: Math.round(area * 100) / 100,
      profileCost: Math.round(profileCost),
      glassCost: Math.round(glassCost),
      hardwareCost: Math.round(hardwareCost),
      laborCost: Math.round(laborCost),
      totalCost,
    };
  }

  getCatalog() {
    return {
      productTypes: ['Window', 'Door', 'Sliding Door', 'Casement Window', 'Fixed Window'],
      systems: ['uPVC', 'Aluminium'],
      profiles: ['Standard', 'Premium', 'Thermal Break'],
      openingTypes: ['Casement', 'Sliding', 'Tilt & Turn', 'Fixed', 'Top Hung'],
      glassTypes: ['Single Glazed', 'Double Glazed', 'Laminated', 'Toughened'],
      colors: ['White', 'Brown', 'Grey', 'Black', 'Wood Grain'],
      hardware: ['Standard', 'Premium', 'Multi-point Lock'],
    };
  }
}
