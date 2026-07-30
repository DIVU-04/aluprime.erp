import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../entities/account.entity';
import { Contact } from '../entities/contact.entity';
import { Opportunity } from '../entities/opportunity.entity';

@Injectable()
export class CrmService {
  constructor(
    @InjectRepository(Account) private readonly accountsRepo: Repository<Account>,
    @InjectRepository(Contact) private readonly contactsRepo: Repository<Contact>,
    @InjectRepository(Opportunity) private readonly opportunitiesRepo: Repository<Opportunity>,
  ) {}

  getAccounts() {
    return this.accountsRepo.find({ order: { createdAt: 'DESC' } });
  }

  getAccount(id: string) {
    return this.accountsRepo.findOne({ where: { id }, relations: { contacts: true } });
  }

  createAccount(data: Partial<Account>) {
    return this.accountsRepo.save(this.accountsRepo.create(data));
  }

  async updateAccount(id: string, data: Partial<Account>) {
    await this.accountsRepo.update(id, data);
    return this.getAccount(id);
  }

  async deleteAccount(id: string) {
    await this.accountsRepo.delete(id);
    return { deleted: true };
  }

  getContacts() {
    return this.contactsRepo.find({ relations: { account: true }, order: { createdAt: 'DESC' } });
  }

  createContact(data: Partial<Contact>) {
    return this.contactsRepo.save(this.contactsRepo.create(data));
  }

  async updateContact(id: string, data: Partial<Contact>) {
    await this.contactsRepo.update(id, data);
    return this.contactsRepo.findOne({ where: { id }, relations: { account: true } });
  }

  async deleteContact(id: string) {
    await this.contactsRepo.delete(id);
    return { deleted: true };
  }

  getOpportunities() {
    return this.opportunitiesRepo.find({ relations: { account: true }, order: { createdAt: 'DESC' } });
  }

  createOpportunity(data: Partial<Opportunity>) {
    return this.opportunitiesRepo.save(this.opportunitiesRepo.create(data));
  }

  async updateOpportunity(id: string, data: Partial<Opportunity>) {
    await this.opportunitiesRepo.update(id, data);
    return this.opportunitiesRepo.findOne({ where: { id }, relations: { account: true } });
  }

  async deleteOpportunity(id: string) {
    await this.opportunitiesRepo.delete(id);
    return { deleted: true };
  }

  async getDashboard() {
    const [accounts, opportunities] = await Promise.all([
      this.accountsRepo.count(),
      this.opportunitiesRepo.find(),
    ]);

    const totalValue = opportunities.reduce((sum, o) => sum + Number(o.value), 0);
    const byStage = opportunities.reduce<Record<string, number>>((acc, o) => {
      acc[o.stage] = (acc[o.stage] || 0) + 1;
      return acc;
    }, {});

    return {
      totalAccounts: accounts,
      totalOpportunities: opportunities.length,
      pipelineValue: totalValue,
      opportunitiesByStage: byStage,
    };
  }
}
