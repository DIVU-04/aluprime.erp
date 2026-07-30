import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProductionService } from './production.service';

@Controller('api/production')
@UseGuards(AuthGuard('jwt'))
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Get('batches')
  findAllBatches() {
    return this.productionService.findAllBatches();
  }

  @Get('batches/:id')
  findBatch(@Param('id') id: string) {
    return this.productionService.findBatch(id);
  }

  @Post('batches')
  createBatch(@Body() body: Record<string, unknown>) {
    return this.productionService.createBatch(body);
  }

  @Put('batches/:id')
  updateBatch(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.productionService.updateBatch(id, body);
  }

  @Post('batches/:id/complete-unit')
  completeUnit(@Param('id') id: string) {
    return this.productionService.completeUnit(id);
  }

  @Delete('batches/:id')
  removeBatch(@Param('id') id: string) {
    return this.productionService.removeBatch(id);
  }

  @Get('dashboard')
  getDashboard() {
    return this.productionService.getDashboard();
  }
}
