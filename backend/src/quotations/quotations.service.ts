import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quotation } from '../entities/quotation.entity';
import { QuotationItem } from '../entities/quotation-item.entity';

@Injectable()
export class QuotationsService {
  constructor(
    @InjectRepository(Quotation) private readonly quotationsRepo: Repository<Quotation>,
    @InjectRepository(QuotationItem) private readonly itemsRepo: Repository<QuotationItem>,
  ) {}

  findAll() {
    return this.quotationsRepo.find({ relations: { items: true }, order: { createdAt: 'DESC' } });
  }

  findOne(id: string) {
    return this.quotationsRepo.findOne({ where: { id }, relations: { items: true } });
  }

  private async generateQuoteNumber() {
    const count = await this.quotationsRepo.count();
    return `QT-${String(count + 1).padStart(5, '0')}`;
  }

  private calculateTotals(items: Partial<QuotationItem>[], taxPercent = 18) {
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.totalPrice || item.unitPrice || 0) * Number(item.quantity || 1),
      0,
    );
    const taxAmount = (subtotal * taxPercent) / 100;
    return { subtotal, taxPercent, taxAmount, total: subtotal + taxAmount };
  }

  async create(data: Record<string, unknown>) {
    const items = (data.items as Partial<QuotationItem>[]) || [];
    const totals = this.calculateTotals(items, Number(data.taxPercent || 18));
    const quoteNumber = await this.generateQuoteNumber();

    const quotation = this.quotationsRepo.create({
      quoteNumber,
      projectName: data.projectName as string,
      customerName: data.customerName as string,
      accountId: data.accountId as string,
      opportunityId: data.opportunityId as string,
      status: (data.status as string) || 'draft',
      notes: data.notes as string,
      validUntil: data.validUntil as string,
      createdBy: data.createdBy as string,
      revision: 1,
      ...totals,
    });

    const saved = await this.quotationsRepo.save(quotation);

    if (items.length) {
      const savedItems = items.map((item) =>
        this.itemsRepo.create({
          ...item,
          quotationId: saved.id,
          totalPrice: Number(item.unitPrice || 0) * Number(item.quantity || 1),
        }),
      );
      await this.itemsRepo.save(savedItems);
    }

    return this.findOne(saved.id);
  }

  async update(id: string, data: Record<string, unknown>) {
    const items = data.items as Partial<QuotationItem>[] | undefined;
    const totals = items ? this.calculateTotals(items, Number(data.taxPercent || 18)) : {};

    await this.quotationsRepo.update(id, {
      projectName: data.projectName as string,
      customerName: data.customerName as string,
      status: data.status as string,
      notes: data.notes as string,
      validUntil: data.validUntil as string,
      ...totals,
    });

    if (items) {
      await this.itemsRepo.delete({ quotationId: id });
      const savedItems = items.map((item) =>
        this.itemsRepo.create({
          ...item,
          quotationId: id,
          totalPrice: Number(item.unitPrice || 0) * Number(item.quantity || 1),
        }),
      );
      await this.itemsRepo.save(savedItems);
    }

    return this.findOne(id);
  }

  async revise(id: string) {
    const original = await this.findOne(id);
    if (!original) return null;

    const { id: _, createdAt, updatedAt, items, ...rest } = original;
    const newQuote = await this.create({
      ...rest,
      revision: original.revision + 1,
      status: 'draft',
      items: items?.map(({ id: itemId, quotationId, ...item }) => item),
    });

    return newQuote;
  }

  async remove(id: string) {
    await this.quotationsRepo.delete(id);
    return { deleted: true };
  }
}
