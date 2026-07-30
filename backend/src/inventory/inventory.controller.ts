import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InventoryService } from './inventory.service';

@Controller('api/inventory')
@UseGuards(AuthGuard('jwt'))
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll(@Query('type') type?: string) {
    return this.inventoryService.findAll(type);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.inventoryService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.inventoryService.update(id, body);
  }

  @Post(':id/adjust')
  adjust(@Param('id') id: string, @Body() body: { quantity: number; reason?: string }) {
    return this.inventoryService.adjustStock(id, body.quantity, body.reason);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inventoryService.remove(id);
  }
}
