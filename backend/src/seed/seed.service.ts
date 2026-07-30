import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Account } from '../entities/account.entity';
import { Contact } from '../entities/contact.entity';
import { Opportunity } from '../entities/opportunity.entity';
import { Quotation } from '../entities/quotation.entity';
import { QuotationItem } from '../entities/quotation-item.entity';
import { Project } from '../entities/project.entity';
import { SalesOrder } from '../entities/sales-order.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { ProductionBatch } from '../entities/production-batch.entity';
import { Dispatch } from '../entities/dispatch.entity';
import { Survey } from '../entities/survey.entity';
import { Design } from '../entities/design.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Account) private readonly accountsRepo: Repository<Account>,
    @InjectRepository(Contact) private readonly contactsRepo: Repository<Contact>,
    @InjectRepository(Opportunity) private readonly opportunitiesRepo: Repository<Opportunity>,
    @InjectRepository(Quotation) private readonly quotationsRepo: Repository<Quotation>,
    @InjectRepository(QuotationItem) private readonly itemsRepo: Repository<QuotationItem>,
    @InjectRepository(Project) private readonly projectsRepo: Repository<Project>,
    @InjectRepository(SalesOrder) private readonly ordersRepo: Repository<SalesOrder>,
    @InjectRepository(InventoryItem) private readonly inventoryRepo: Repository<InventoryItem>,
    @InjectRepository(ProductionBatch) private readonly batchesRepo: Repository<ProductionBatch>,
    @InjectRepository(Dispatch) private readonly dispatchRepo: Repository<Dispatch>,
    @InjectRepository(Survey) private readonly surveyRepo: Repository<Survey>,
    @InjectRepository(Design) private readonly designsRepo: Repository<Design>,
  ) {}

  async onModuleInit() {
    const userCount = await this.usersRepo.count();
    if (userCount > 0) return;
    await this.seed();
  }

  async seed() {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await this.usersRepo.save([
      this.usersRepo.create({
        email: 'admin@aluprime.com',
        passwordHash,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
      }),
      this.usersRepo.create({
        email: 'sales@aluprime.com',
        passwordHash,
        firstName: 'Sales',
        lastName: 'Executive',
        role: 'sales',
      }),
    ]);

    const account = await this.accountsRepo.save(
      this.accountsRepo.create({
        name: 'Skyline Builders Pvt Ltd',
        type: 'Builder',
        industry: 'Construction',
        phone: '+91 98765 43210',
        email: 'contact@skylinebuilders.com',
        address: '42 Industrial Area',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        managedBy: 'Sales Executive',
        status: 'active',
      }),
    );

    await this.contactsRepo.save(
      this.contactsRepo.create({
        firstName: 'Rajesh',
        lastName: 'Kumar',
        email: 'rajesh@skylinebuilders.com',
        phone: '+91 98765 43211',
        role: 'Project Manager',
        accountId: account.id,
      }),
    );

    const opportunity = await this.opportunitiesRepo.save(
      this.opportunitiesRepo.create({
        title: 'Premium Tower - Phase 2 Windows',
        description: 'uPVC windows for 120 apartments',
        value: 4500000,
        stage: 'proposal',
        source: 'Referral',
        location: 'Mumbai',
        assignedTo: 'Sales Executive',
        accountId: account.id,
        expectedCloseDate: '2026-09-30',
      }),
    );

    const design = await this.designsRepo.save(
      this.designsRepo.create({
        name: 'Casement Window 1200x1500',
        productType: 'Window',
        system: 'uPVC',
        profile: 'Premium',
        width: 1200,
        height: 1500,
        panels: 2,
        openingType: 'Casement',
        glassType: 'Double Glazed',
        hardware: 'Multi-point Lock',
        color: 'White',
        estimatedCost: 18500,
      }),
    );

    const quotation = await this.quotationsRepo.save(
      this.quotationsRepo.create({
        quoteNumber: 'QT-00001',
        projectName: 'Premium Tower Phase 2',
        customerName: 'Skyline Builders Pvt Ltd',
        accountId: account.id,
        opportunityId: opportunity.id,
        status: 'sent',
        subtotal: 2220000,
        taxPercent: 18,
        taxAmount: 399600,
        total: 2619600,
        revision: 1,
        validUntil: '2026-08-30',
      }),
    );

    await this.itemsRepo.save(
      this.itemsRepo.create({
        quotationId: quotation.id,
        designId: design.id,
        description: 'Casement Window 1200x1500 uPVC',
        productType: 'Window',
        system: 'uPVC',
        width: 1200,
        height: 1500,
        quantity: 120,
        unitPrice: 18500,
        totalPrice: 2220000,
      }),
    );

    const project = await this.projectsRepo.save(
      this.projectsRepo.create({
        name: 'Premium Tower Phase 2',
        code: 'PRJ-0001',
        customerName: 'Skyline Builders Pvt Ltd',
        accountId: account.id,
        quotationId: quotation.id,
        siteAddress: 'Andheri East, Mumbai',
        latitude: 19.1136,
        longitude: 72.8697,
        status: 'in_progress',
        projectManager: 'Admin User',
        startDate: '2026-06-01',
        targetCompletionDate: '2026-12-31',
      }),
    );

    await this.ordersRepo.save(
      this.ordersRepo.create({
        orderNumber: 'SO-00001',
        projectId: project.id,
        quotationId: quotation.id,
        customerName: 'Skyline Builders Pvt Ltd',
        status: 'confirmed',
        totalAmount: 2619600,
        orderDate: '2026-07-01',
        deliveryDate: '2026-11-30',
      }),
    );

    await this.inventoryRepo.save([
      this.inventoryRepo.create({
        sku: 'UPVC-PROF-70',
        name: 'uPVC Profile 70mm',
        category: 'Profile',
        materialType: 'uPVC',
        unit: 'meter',
        quantityOnHand: 2500,
        reorderLevel: 500,
        unitCost: 450,
        location: 'Warehouse A',
        inventoryType: 'raw',
      }),
      this.inventoryRepo.create({
        sku: 'GLASS-DG-6MM',
        name: 'Double Glazed Glass 6mm',
        category: 'Glass',
        materialType: 'Glass',
        unit: 'sqm',
        quantityOnHand: 800,
        reorderLevel: 200,
        unitCost: 1200,
        location: 'Warehouse B',
        inventoryType: 'raw',
      }),
      this.inventoryRepo.create({
        sku: 'FG-WIN-1200',
        name: 'Finished Window 1200x1500',
        category: 'Finished Goods',
        materialType: 'Window',
        unit: 'piece',
        quantityOnHand: 45,
        reorderLevel: 10,
        unitCost: 18500,
        location: 'FG Store',
        inventoryType: 'finished',
      }),
    ]);

    const batch = await this.batchesRepo.save(
      this.batchesRepo.create({
        batchNumber: 'BATCH-0001',
        projectId: project.id,
        status: 'in_progress',
        scheduledDate: '2026-07-15',
        startDate: '2026-07-16',
        totalUnits: 120,
        completedUnits: 45,
        assignedLine: 'Line 1',
      }),
    );

    await this.dispatchRepo.save(
      this.dispatchRepo.create({
        dispatchNumber: 'DSP-00001',
        projectId: project.id,
        batchId: batch.id,
        status: 'pending',
        dispatchDate: '2026-08-01',
        destination: 'Andheri East, Mumbai',
        totalItems: 30,
      }),
    );

    await this.surveyRepo.save(
      this.surveyRepo.create({
        projectId: project.id,
        opportunityId: opportunity.id,
        siteName: 'Premium Tower Site',
        siteAddress: 'Andheri East, Mumbai',
        surveyorName: 'Field Surveyor',
        surveyDate: '2026-05-15',
        status: 'completed',
        checklistData: JSON.stringify({
          wallCondition: 'Good',
          measurementsVerified: true,
          accessClear: true,
        }),
        measurements: JSON.stringify([
          { location: 'Tower A - Floor 5', width: 1200, height: 1500, qty: 8 },
        ]),
      }),
    );
  }
}
