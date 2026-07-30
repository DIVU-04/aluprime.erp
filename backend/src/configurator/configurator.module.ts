import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Design } from '../entities/design.entity';
import { ConfiguratorController } from './configurator.controller';
import { ConfiguratorService } from './configurator.service';

@Module({
  imports: [TypeOrmModule.forFeature([Design])],
  controllers: [ConfiguratorController],
  providers: [ConfiguratorService],
})
export class ConfiguratorModule {}
