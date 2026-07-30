import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CrmService } from './crm.service';

@Controller('api/crm')
@UseGuards(AuthGuard('jwt'))
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get('accounts')
  getAccounts() {
    return this.crmService.getAccounts();
  }

  @Get('accounts/:id')
  getAccount(@Param('id') id: string) {
    return this.crmService.getAccount(id);
  }

  @Post('accounts')
  createAccount(@Body() body: Record<string, unknown>) {
    return this.crmService.createAccount(body);
  }

  @Put('accounts/:id')
  updateAccount(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.crmService.updateAccount(id, body);
  }

  @Delete('accounts/:id')
  deleteAccount(@Param('id') id: string) {
    return this.crmService.deleteAccount(id);
  }

  @Get('contacts')
  getContacts() {
    return this.crmService.getContacts();
  }

  @Post('contacts')
  createContact(@Body() body: Record<string, unknown>) {
    return this.crmService.createContact(body);
  }

  @Put('contacts/:id')
  updateContact(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.crmService.updateContact(id, body);
  }

  @Delete('contacts/:id')
  deleteContact(@Param('id') id: string) {
    return this.crmService.deleteContact(id);
  }

  @Get('opportunities')
  getOpportunities() {
    return this.crmService.getOpportunities();
  }

  @Post('opportunities')
  createOpportunity(@Body() body: Record<string, unknown>) {
    return this.crmService.createOpportunity(body);
  }

  @Put('opportunities/:id')
  updateOpportunity(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.crmService.updateOpportunity(id, body);
  }

  @Delete('opportunities/:id')
  deleteOpportunity(@Param('id') id: string) {
    return this.crmService.deleteOpportunity(id);
  }

  @Get('dashboard')
  getDashboard() {
    return this.crmService.getDashboard();
  }
}
