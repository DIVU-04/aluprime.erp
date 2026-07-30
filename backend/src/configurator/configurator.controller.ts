import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfiguratorService } from './configurator.service';

@Controller('api/configurator')
@UseGuards(AuthGuard('jwt'))
export class ConfiguratorController {
  constructor(private readonly configuratorService: ConfiguratorService) {}

  @Get('designs')
  findAll() {
    return this.configuratorService.findAll();
  }

  @Get('designs/:id')
  findOne(@Param('id') id: string) {
    return this.configuratorService.findOne(id);
  }

  @Post('designs')
  create(@Body() body: Record<string, unknown>) {
    return this.configuratorService.create(body);
  }

  @Put('designs/:id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.configuratorService.update(id, body);
  }

  @Post('estimate')
  estimate(@Body() body: Record<string, unknown>) {
    return this.configuratorService.estimateCost(body);
  }

  @Delete('designs/:id')
  remove(@Param('id') id: string) {
    return this.configuratorService.remove(id);
  }

  @Get('catalog')
  getCatalog() {
    return this.configuratorService.getCatalog();
  }
}
