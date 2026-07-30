import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DispatchService } from './dispatch.service';

@Controller('api/dispatch')
@UseGuards(AuthGuard('jwt'))
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Get()
  findAll() {
    return this.dispatchService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dispatchService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.dispatchService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.dispatchService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dispatchService.remove(id);
  }
}
