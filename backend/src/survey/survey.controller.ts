import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SurveyService } from './survey.service';

@Controller('api/survey')
@UseGuards(AuthGuard('jwt'))
export class SurveyController {
  constructor(private readonly surveyService: SurveyService) {}

  @Get()
  findAll() {
    return this.surveyService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.surveyService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.surveyService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.surveyService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.surveyService.remove(id);
  }
}
