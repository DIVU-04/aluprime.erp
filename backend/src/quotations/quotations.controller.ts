import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QuotationsService } from './quotations.service';

@Controller('api/quotations')
@UseGuards(AuthGuard('jwt'))
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get()
  findAll() {
    return this.quotationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quotationsService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.quotationsService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.quotationsService.update(id, body);
  }

  @Post(':id/revise')
  revise(@Param('id') id: string) {
    return this.quotationsService.revise(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.quotationsService.remove(id);
  }
}
