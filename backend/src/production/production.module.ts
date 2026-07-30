import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionBatch } from '../entities/production-batch.entity';
import { ProductionController } from './production.controller';
import { ProductionService } from './production.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProductionBatch])],
  controllers: [ProductionController],
  providers: [ProductionService],
})
export class ProductionModule {}
