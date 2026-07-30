import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dispatch } from '../entities/dispatch.entity';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';

@Module({
  imports: [TypeOrmModule.forFeature([Dispatch])],
  controllers: [DispatchController],
  providers: [DispatchService],
})
export class DispatchModule {}
